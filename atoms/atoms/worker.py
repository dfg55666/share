#!/usr/bin/env python3
"""
Hybrid Atoms registration flow (current magic-link version):
- Browser (chrome-mcp):
  - inject a Turnstile widget on register page
  - click fixed coordinates (CDP) to trigger challenge
  - read cf-turnstile-response token
- HTTP (curl_cffi):
  - POST /api/v1/user/send-magic-link
  - GET  /api/v1/user/verify-magic-link
  - GET  /api/v1/transaction/balance
- mail.tm: poll inbox for verification link token
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
import random
import re
import sys
import queue
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

from curl_cffi import requests as c_requests

from mailtm_inbox import MailTMInbox
from proxy_pool import (
    mask_proxy_url,
    select_proxy_url_for_worker,
    working_proxy_urls,
    RotatingProxyPool,
)


ATOMS_BASE = "https://atoms.dev"
ATOMS_REGISTER_URL = f"{ATOMS_BASE}/zh/register"
DEFAULT_IMPERSONATE = "chrome120"
DEFAULT_OUTPUT_KEY_SHA256 = False
DEFAULT_APIKEY_MODELS = "gemini-3.1-pro-preview,deepseek-v4-pro,claude-opus-4.6"

# Captured from a known-good browser registration request.
# Some backends validate the fingerprint format/content; random bytes can fail.
KNOWN_GOOD_DEVICE_FINGERPRINT = (
    "tnP3qBFhrU0nLVJoGoPpDUJnMRMpDdJmDdTmDZX2DRX5NVMpF3O4GUJ1MUX2DoOlOdFcwBWcwdCxrIDoGfloMUY1NLO7"
    "tnP3NVb2MLO7OfzcyoM0efhbqos3ZdN1JozkHda5qRilFZl7GUu2Gmu6w3N/qZ1/G3rfqVv0AZJ7GIFbA3MDwfC6wLim"
    "tEz6JNF8wUCbFZujJ3z0DLi5wfzaAaF2rZTgD5YDe4M8JOP6P4i3Ad2vr3M7HpC4PNGTOovoMICnNBKhw35oGpOnF420y"
    "J=="
)


class StreamableHttpMCPClient:
    def __init__(self, base_url: str, timeout: float = 30.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = float(timeout)
        self.session_id: Optional[str] = None
        self._request_id = 1

    def _next_id(self) -> int:
        rid = self._request_id
        self._request_id += 1
        return rid

    def _post(self, payload: Dict[str, Any], with_session: bool = True) -> Dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if with_session and self.session_id:
            headers["mcp-session-id"] = self.session_id

        req = urllib.request.Request(self.base_url, data=body, method="POST", headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if not self.session_id:
                    self.session_id = resp.headers.get("mcp-session-id") or self.session_id
                raw = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"MCP HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"MCP request failed: {exc}") from exc

        # MCP can respond as SSE; take the last data: line.
        if raw.lstrip().startswith("event:") or raw.lstrip().startswith("data:"):
            data_lines = []
            for line in raw.splitlines():
                if line.startswith("data:"):
                    data_lines.append(line[len("data:") :].strip())
            if not data_lines:
                raise RuntimeError(f"Invalid MCP SSE payload: {raw[:400]}")
            raw = data_lines[-1]

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"MCP non-JSON response: {raw[:400]}") from exc

        if isinstance(parsed, dict) and "error" in parsed:
            raise RuntimeError(f"MCP error: {json.dumps(parsed['error'], ensure_ascii=False)}")
        if not isinstance(parsed, dict):
            raise RuntimeError(f"MCP unexpected payload type: {type(parsed).__name__}")
        return parsed

    def initialize(self) -> None:
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "atoms-register-hybrid", "version": "0.1.0"},
            },
        }
        self._post(payload, with_session=False)
        if not self.session_id:
            raise RuntimeError("MCP initialize succeeded but no mcp-session-id header")

    def call_tool_json(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        if not self.session_id:
            raise RuntimeError("MCP session not initialized")
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        resp = self._post(payload, with_session=True)
        result = resp.get("result", {})
        content = result.get("content", [])
        if not isinstance(content, list) or not content:
            return {}
        first = content[0]
        if not isinstance(first, dict) or first.get("type") != "text":
            return {}
        text = str(first.get("text", "")).strip()
        if not text:
            return {}
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw_text": text}


def _safe_print(line: str) -> None:
    print(line, flush=True)


def _apply_proxy_for_worker_session(
    session: c_requests.Session,
    *,
    worker_kind: str,
    worker_id: int,
    args: argparse.Namespace,
    enabled: bool = True,
    proxy_pool: Optional[RotatingProxyPool] = None,
) -> str:
    if not bool(args.proxy_enabled) or not bool(enabled):
        session.proxies = {}
        return ""
    override = str(args.proxy_url or "").strip()
    if override:
        proxy_url = override
    elif proxy_pool:
        proxy_url = proxy_pool.get_proxy()
    else:
        pool = [x.strip() for x in str(args.proxy_pool or "").split(",") if x.strip()]
        proxy_url = select_proxy_url_for_worker(worker_id, urls=pool or working_proxy_urls())

    if not proxy_url:
        session.proxies = {}
        return ""
    session.proxies = {"http": proxy_url, "https": proxy_url}
    _safe_print(f"[{worker_kind}-{worker_id}] proxy={mask_proxy_url(proxy_url)}")
    return proxy_url


def _emit_task_result(task_id: int, payload: Dict[str, Any]) -> None:
    out = {
        "provider_type": "atoms",
        "success": bool(payload.get("success")),
        "email": str(payload.get("email") or ""),
        "app_id": str(payload.get("app_id") or ""),
        "app_ai_key": str(payload.get("app_ai_key") or ""),
        "app_ai_key_masked": str(payload.get("app_ai_key_masked") or ""),
        "app_ai_key_sha256": str(payload.get("app_ai_key_sha256") or ""),
        "jwt": str(payload.get("jwt") or payload.get("token") or ""),
        "error": str(payload.get("error") or ""),
    }
    _safe_print(f"[T{task_id}] TASK_RESULT_JSON:{json.dumps(out, ensure_ascii=False)}")


def _safe_tool_call(client: StreamableHttpMCPClient, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    try:
        resp = client.call_tool_json(tool_name, arguments)
        return resp if isinstance(resp, dict) else {}
    except Exception:
        return {}


def _js(client: StreamableHttpMCPClient, tab_id: int, code: str, max_output_bytes: int = 51200) -> Dict[str, Any]:
    return client.call_tool_json(
        "chrome_javascript",
        {
            "tabId": tab_id,
            "mode": "functionBody",
            "code": code,
            "maxOutputBytes": int(max_output_bytes),
            "failIfFallback": False,
            "allowUnsafeEvalFallback": True,
        },
    )


def _result_dict(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    result = payload.get("result")
    if isinstance(result, dict):
        return result
    if isinstance(result, str):
        text = result.strip()
        if text.startswith("{") and text.endswith("}"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return {}
    return {}


def _api_code(payload: Dict[str, Any]) -> int:
    if not isinstance(payload, dict):
        return -1
    value = payload.get("code")
    if value is None:
        return -1
    try:
        return int(value)
    except Exception:
        return -1


def _generate_device_fingerprint() -> str:
    # Observed in capture: base64 string length=280 with "==" padding.
    # 208 bytes -> 280 base64 chars with "==".
    raw = os.urandom(208)
    return base64.b64encode(raw).decode("ascii")


def _generate_username() -> str:
    # Keep it simple; server allows digits.
    return f"user{random.randint(100000, 999999)}"


def _atoms_headers(request_id: str, with_json: bool = True) -> Dict[str, str]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Referer": ATOMS_REGISTER_URL,
        "X-Locale": "en",
        "X-Request-ID": request_id,
        "version": "atoms",
    }
    if with_json:
        headers["Content-Type"] = "application/json"
    return headers


def _looks_like_cf_block(text: str) -> bool:
    lower = (text or "").lower()
    if "just a moment" in lower and "cloudflare" in lower:
        return True
    if "attention required" in lower and "cloudflare" in lower:
        return True
    if "sorry, you have been blocked" in lower and "cloudflare" in lower:
        return True
    return False


def _raise_http_error(label: str, resp: c_requests.Response) -> None:
    ct = str(resp.headers.get("content-type") or "")
    text = resp.text or ""
    if _looks_like_cf_block(text):
        raise RuntimeError(
            f"{label}: Cloudflare block page (status={resp.status_code}, ct={ct}). "
            "Use the hybrid flow (browser for Turnstile) and curl_cffi impersonation."
        )
    snippet = text.replace("\r", "").replace("\n", " ")[:500]
    raise RuntimeError(f"{label}: status={resp.status_code}, ct={ct}, body={snippet}")


def _json_or_error(label: str, resp: c_requests.Response) -> Dict[str, Any]:
    if resp.status_code >= 400:
        _raise_http_error(label, resp)
    try:
        data = resp.json()
    except Exception:
        _raise_http_error(label + " (expected json)", resp)
    if not isinstance(data, dict):
        return {"raw": data}
    return data


def _atoms_activation(
    s: c_requests.Session, email: str, impersonate: str, timeout_s: int
) -> Dict[str, Any]:
    # Triggers verification email delivery.
    request_id = f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}"
    headers = _atoms_headers(request_id, with_json=True)
    resp = s.post(
        f"{ATOMS_BASE}/api/v1/user/activation",
        headers=headers,
        json={"email": email, "length": 6},
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error("POST /api/v1/user/activation", resp)


def _atoms_register(
    s: c_requests.Session,
    username: str,
    email: str,
    password: str,
    code: str,
    device_fingerprint: str,
    captcha: str,
    impersonate: str,
    timeout_s: int,
) -> Dict[str, Any]:
    request_id = f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}"
    headers = _atoms_headers(request_id, with_json=True)
    resp = s.post(
        f"{ATOMS_BASE}/api/v1/user/register",
        headers=headers,
        json={
            "username": username,
            "email": email,
            "password": password,
            "code": code,
            "device_fingerprint": device_fingerprint,
            "captcha": captcha,
        },
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error("POST /api/v1/user/register", resp)


def _atoms_balance(
    s: c_requests.Session, token: str, impersonate: str, timeout_s: int
) -> Dict[str, Any]:
    request_id = f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}"
    headers = _atoms_headers(request_id, with_json=False)
    headers["Authorization"] = token
    resp = s.get(
        f"{ATOMS_BASE}/api/v1/transaction/balance",
        headers=headers,
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error("GET /api/v1/transaction/balance", resp)


def _atoms_send_magic_link(
    s: c_requests.Session,
    email: str,
    password: str,
    captcha: str,
    device_fingerprint: str,
    impersonate: str,
    timeout_s: int,
    redirect: str = "/",
) -> Dict[str, Any]:
    request_id = f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}"
    headers = _atoms_headers(request_id, with_json=True)
    resp = s.post(
        f"{ATOMS_BASE}/api/v1/user/send-magic-link",
        headers=headers,
        json={
            "email": email,
            "password": password,
            "captcha": captcha,
            "device_fingerprint": device_fingerprint,
            "redirect": redirect,
        },
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error("POST /api/v1/user/send-magic-link", resp)


def _atoms_verify_magic_link(
    s: c_requests.Session,
    email: str,
    verification_token: str,
    impersonate: str,
    timeout_s: int,
) -> Dict[str, Any]:
    request_id = f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}"
    headers = _atoms_headers(request_id, with_json=False)
    resp = s.get(
        f"{ATOMS_BASE}/api/v1/user/verify-magic-link",
        headers=headers,
        params={"token": verification_token, "email": email},
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error("GET /api/v1/user/verify-magic-link", resp)


def _atoms_auth_headers(token: str, with_json: bool = True) -> Dict[str, str]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Authorization": str(token),
        "X-Locale": "zh",
        "version": "atoms",
    }
    if with_json:
        headers["Content-Type"] = "application/json"
    return headers


def _atoms_create_chat(
    s: c_requests.Session,
    token: str,
    model: str,
    chat_agent_mode: str,
    workspace_id: int,
    impersonate: str,
    timeout_s: int,
) -> str:
    headers = _atoms_auth_headers(token=token, with_json=True)
    payload: Dict[str, Any] = {
        "llm": {"default_model": str(model)},
        "config": {"agent_mode": str(chat_agent_mode)},
    }
    if int(workspace_id) > 0:
        payload["workspace_id"] = int(workspace_id)
    resp = s.post(
        f"{ATOMS_BASE}/api/v1/chats",
        headers=headers,
        json=payload,
        timeout=timeout_s,
        impersonate=impersonate,
    )
    data = _json_or_error("POST /api/v1/chats", resp)
    if _api_code(data) != 0:
        raise RuntimeError(f"create chat failed: {data}")
    chat_id = str(((data.get("data") or {}) if isinstance(data.get("data"), dict) else {}).get("chat_id") or "")
    if not chat_id:
        raise RuntimeError(f"create chat missing chat_id: {data}")
    return chat_id


def _atoms_send_chat_message(
    s: c_requests.Session,
    token: str,
    chat_id: str,
    message: str,
    message_agent_mode: str,
    default_model: str,
    impersonate: str,
    timeout_s: int,
) -> Dict[str, Any]:
    headers = _atoms_auth_headers(token=token, with_json=True)
    resp = s.post(
        f"{ATOMS_BASE}/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": [{"insert": message}],
            "type": "message",
            "metadata": {
                "agent_mode": str(message_agent_mode),
                "default_model": str(default_model),
                "enable_dr": False,
                "dr_model": "auto",
                "enable_funcsea": False,
            },
            "use_boost": False,
            "use_auto_model": True,
            "boost_models": [],
        },
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error(f"POST /api/v1/chats/{chat_id}/messages", resp)


def _atoms_get_workspace_id(
    s: c_requests.Session,
    token: str,
    impersonate: str,
    timeout_s: int,
) -> int:
    headers = _atoms_auth_headers(token=token, with_json=False)
    resp = s.get(
        f"{ATOMS_BASE}/api/v1/chats",
        headers=headers,
        params={"page_num": 1},
        timeout=timeout_s,
        impersonate=impersonate,
    )
    data = _json_or_error("GET /api/v1/chats?page_num=1", resp)
    if _api_code(data) != 0:
        return 0
    rows = (((data.get("data") or {}) if isinstance(data.get("data"), dict) else {}).get("data_list") or [])
    if not isinstance(rows, list):
        return 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            ws = int(row.get("workspace_id") or 0)
        except Exception:
            ws = 0
        if ws > 0:
            return ws
    return 0


def _atoms_get_messages(
    s: c_requests.Session,
    token: str,
    chat_id: str,
    impersonate: str,
    timeout_s: int,
    page_num: int = 5000,
) -> Dict[str, Any]:
    headers = _atoms_auth_headers(token=token, with_json=False)
    resp = s.get(
        f"{ATOMS_BASE}/api/v1/chats/{chat_id}/messages",
        headers=headers,
        params={"chatId": chat_id, "cur_page": 1, "page_num": int(page_num)},
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _json_or_error(f"GET /api/v1/chats/{chat_id}/messages", resp)


def _content_to_text(content: Any) -> str:
    if isinstance(content, list):
        return "".join(str(x.get("insert") or "") for x in content if isinstance(x, dict))
    if isinstance(content, dict):
        ops = content.get("ops")
        if isinstance(ops, list):
            return "".join(str(x.get("insert") or "") for x in ops if isinstance(x, dict))
    if content is None:
        return ""
    return str(content)


def _poll_app_ai_key_from_chat(
    s: c_requests.Session,
    token: str,
    chat_id: str,
    timeout_s: float,
    poll_interval_s: float,
    first_poll_delay_s: float,
    impersonate: str,
    http_timeout_s: int,
) -> str:
    deadline = time.time() + float(timeout_s)
    if float(first_poll_delay_s) > 0:
        time.sleep(float(first_poll_delay_s))
    seen_ids: set[int] = set()
    while time.time() < deadline:
        try:
            payload = _atoms_get_messages(
                s=s,
                token=token,
                chat_id=chat_id,
                impersonate=impersonate,
                timeout_s=http_timeout_s,
            )
        except Exception:
            time.sleep(max(0.5, float(poll_interval_s)))
            continue

        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        rows = (data or {}).get("data_list")
        if not isinstance(rows, list):
            time.sleep(max(0.5, float(poll_interval_s)))
            continue

        for row in rows:
            if not isinstance(row, dict):
                continue
            msg_id_raw = row.get("id")
            try:
                msg_id = int(msg_id_raw)
            except Exception:
                msg_id = 0
            if msg_id > 0 and msg_id in seen_ids:
                continue
            if msg_id > 0:
                seen_ids.add(msg_id)

            role = str(row.get("role") or "").strip().lower()
            if role == "user":
                continue
            text = _content_to_text(row.get("content"))
            key = _extract_app_ai_key(text)
            if key:
                return key
            # Some models may place the target string outside visible `content`.
            key = _extract_app_ai_key_anywhere(row)
            if key:
                return key
        time.sleep(max(0.5, float(poll_interval_s)))
    return ""


def _extract_app_ai_key(text: str) -> str:
    body = str(text or "")
    if not body:
        return ""
    body = body.replace("\r\n", "\n")
    block = re.search(r"BEGIN_ATOMS_SECRET(.*?)END_ATOMS_SECRET", body, re.IGNORECASE | re.DOTALL)
    targets = [block.group(1)] if block else []
    targets.append(body)

    def normalize(raw: str) -> str:
        value = str(raw or "").strip().strip("`'\"")
        value = value.replace("\u200b", "").replace("\ufeff", "").strip()
        value = value.rstrip("`'\"。；;，,）)]}>")
        if not value:
            return ""
        if value.upper().startswith("NOT_FOUND"):
            return ""
        m_key = re.search(r"\b(sk-[A-Za-z0-9]+)\b", value)
        if m_key:
            return m_key.group(1)
        return ""

    patterns = (
        r"`?\s*APP_AI_KEY\s*`?\s*[:=：]\s*`?([^\n`]+)`?",
        r"APP_AI_KEY[^A-Za-z0-9]{0,12}(sk-[A-Za-z0-9]+)",
    )
    for target in targets:
        for pat in patterns:
            m = re.search(pat, target, re.IGNORECASE)
            if not m:
                continue
            key = normalize(m.group(1))
            if key:
                return key

        # Fallback: if a BEGIN/END block exists, allow direct key extraction in block text.
        m_direct = re.search(r"\b(sk-[A-Za-z0-9]{16,})\b", target, re.IGNORECASE)
        if m_direct:
            key = normalize(m_direct.group(1))
            if key:
                return key
    return ""


def _collect_string_fragments(node: Any, out: list[str]) -> None:
    if isinstance(node, str):
        text = node.strip()
        if text:
            out.append(text)
        return
    if isinstance(node, dict):
        for value in node.values():
            _collect_string_fragments(value, out)
        return
    if isinstance(node, list):
        for item in node:
            _collect_string_fragments(item, out)
        return


def _extract_app_ai_key_anywhere(node: Any) -> str:
    fragments: list[str] = []
    _collect_string_fragments(node, fragments)
    for frag in fragments:
        key = _extract_app_ai_key(frag)
        if key:
            return key
    if fragments:
        key = _extract_app_ai_key("\n".join(fragments))
        if key:
            return key
    return ""


def _parse_apikey_models(raw: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for part in str(raw or "").split(","):
        model = part.strip()
        if not model or model in seen:
            continue
        seen.add(model)
        out.append(model)
    return out


def _mask_secret(value: str) -> str:
    raw = str(value or "")
    if not raw:
        return "NOT_FOUND"
    if len(raw) <= 10:
        return raw[:2] + "***"
    return raw[:6] + "..." + raw[-4:]


def _sha256_hex(value: str) -> str:
    raw = str(value or "")
    if not raw:
        return ""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _append_summary_text(path: Path, payload: Dict[str, Any], task_id: int) -> None:
    email = str(payload.get("email") or "")
    app_id = str(payload.get("app_id") or "")
    app_ai_key = str(payload.get("app_ai_key") or "")
    if not app_ai_key:
        app_ai_key = "NOT_FOUND"
    jwt = str(payload.get("jwt") or payload.get("token") or "")
    success = bool(payload.get("success"))
    status = "OK" if success else "NO_KEY"
    chat_id = str(payload.get("chat_id") or "")
    model_used = str(payload.get("model_used") or "")
    error = str(payload.get("error") or "").replace("\n", " ").strip()
    line = f"email={email} app_id={app_id} chat_id={chat_id} model={model_used} APP_AI_KEY={app_ai_key} JWT={jwt} STATUS={status}"
    if error:
        line += f" ERROR={error}"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def _maybe_clear_atoms_site_data(client: StreamableHttpMCPClient, tab_id: int) -> None:
    _safe_tool_call(
        client,
        "chrome_clear_site_data",
        {
            "tabId": tab_id,
            "domain": "atoms.dev",
            "reload": True,
        },
    )


def _wait_for_step1(client: StreamableHttpMCPClient, tab_id: int, timeout_s: float) -> None:
    deadline = time.time() + float(timeout_s)
    last = ""
    while time.time() < deadline:
        state = _result_dict(
            _js(
                client,
                tab_id,
                """
const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim().toLowerCase();
const hasRect = (el) => {
  try { const r = el.getBoundingClientRect(); return !!r && r.width > 2 && r.height > 2; } catch (_) { return false; }
};
const inputs = Array.from(document.querySelectorAll('input')).filter(hasRect);
const isPw = (el) => String(el.type || '').toLowerCase() === 'password';
const pw = inputs.filter(isPw);
const byPh = (re) => inputs.find((el) => re.test(String(el.placeholder || '')) || re.test(String(el.name || '')) || re.test(String(el.id || '')));
const username = byPh(/user(name)?|用户名|昵称/i);
const email = byPh(/email|邮箱/i);
const turn = document.querySelector('input[name=\"cf-turnstile-response\"]');
let step = 'unknown';
if (turn) step = 'step2';
else if (email && pw.length >= 1) step = 'step1';
return { path: location.pathname, step, usernameFound: !!username, emailFound: !!email, pwCount: pw.length, turnstileFound: !!turn };
""",
            )
        )
        stage = str(state.get("step") or "")
        if stage == "step1":
            return
        if stage != last:
            _safe_print(f"[mcp] waiting step1 (now={stage})")
            last = stage
        time.sleep(0.6)
    raise RuntimeError("atoms step1 form not found")


def _fill_step1_and_continue(
    client: StreamableHttpMCPClient, tab_id: int, username: str, email: str, password: str
) -> None:
    def fill_css(selectors: list[str], value: str, label: str) -> None:
        last: Dict[str, Any] = {}
        for _ in range(30):
            for sel in selectors:
                resp = _safe_tool_call(
                    client,
                    "chrome_fill_or_select",
                    {"tabId": tab_id, "selector": sel, "selectorType": "css", "value": str(value)},
                )
                last = resp if isinstance(resp, dict) else {}
                if last.get("success") is True:
                    return
            time.sleep(0.3)
        raise RuntimeError(f"fill failed ({label}): last={last}")

    # These selectors intentionally avoid the duplicate hidden inputs by requiring placeholders.
    # Hydration can still wipe values, so we fill+verify a few times.
    for _ in range(5):
        fill_css(["input[name=\"username\"][placeholder*=\"用户名\"]", "input[placeholder*=\"用户名\"]"], username, "username")
        fill_css(
            ["input[name=\"email\"][placeholder*=\"邮箱\"]", "input[placeholder*=\"邮箱\"]", "input[name=\"email\"]"],
            email,
            "email",
        )
        fill_css(
            ["input[name=\"password\"][placeholder=\"密码\"]", "input[placeholder=\"密码\"]"],
            password,
            "password",
        )
        fill_css(
            ["input[name=\"password2\"][placeholder*=\"确认\"]", "input[placeholder*=\"确认密码\"]", "input[name=\"password2\"]"],
            password,
            "confirm_password",
        )

        # Verify the visible fields have values (placeholder-based inputs).
        vals = _result_dict(
            _js(
                client,
                tab_id,
                """
const pick = (sel) => document.querySelector(sel);
const u = pick('input[placeholder*=\"用户名\"]');
const e = pick('input[placeholder*=\"邮箱\"]');
const p1 = pick('input[placeholder=\"密码\"]');
const p2 = pick('input[placeholder*=\"确认密码\"], input[placeholder*=\"确认\"]');
return {
  ok: true,
  uLen: u ? String(u.value||'').length : 0,
  eLen: e ? String(e.value||'').length : 0,
  p1Len: p1 ? String(p1.value||'').length : 0,
  p2Len: p2 ? String(p2.value||'').length : 0,
};
""",
                max_output_bytes=20000,
            )
        )
        if int(vals.get("uLen") or 0) > 0 and int(vals.get("eLen") or 0) > 0 and int(vals.get("p1Len") or 0) > 0 and int(vals.get("p2Len") or 0) > 0:
            break
        time.sleep(0.4)

    # Ensure terms checkbox is checked (the real <input> can be opacity:0).
    for _ in range(3):
        state = _result_dict(
            _js(
                client,
                tab_id,
                """
const cb = document.querySelector('input[type=\"checkbox\"]');
if (!cb) return { ok: true, found: false, checked: null };
try { if (!cb.checked) cb.click(); } catch (_) {}
return { ok: true, found: true, checked: !!cb.checked, opacity: String(getComputedStyle(cb).opacity || '') };
""",
                max_output_bytes=20000,
            )
        )
        if state.get("found") is False or state.get("checked") is True:
            break
        time.sleep(0.3)

    # Wait for "Continue/继续" to become enabled (async validation + checkbox wiring).
    deadline = time.time() + 15.0
    last_disabled: Optional[bool] = None
    while time.time() < deadline:
        btn_state = _result_dict(
            _js(
                client,
                tab_id,
                """
const norm=(s)=>String(s||'').replace(/\\s+/g,' ').trim().toLowerCase();
const btn = Array.from(document.querySelectorAll('button')).find((b)=> {
  const t=norm(b.textContent);
  return t === 'continue' || t.includes('continue') || t.includes('next') || t.includes('继续') || t.includes('下一步');
}) || null;
return { ok: true, found: !!btn, text: btn ? String(btn.textContent||'').trim() : '', disabled: btn ? !!btn.disabled : null };
""",
                max_output_bytes=20000,
            )
        )
        if not bool(btn_state.get("ok")):
            break
        if btn_state.get("disabled") is False:
            break
        if last_disabled is None or bool(btn_state.get("disabled")) != bool(last_disabled):
            _safe_print("[mcp] continue disabled, waiting...")
            last_disabled = bool(btn_state.get("disabled"))
        time.sleep(0.4)

    # Click continue.
    click_resp = _safe_tool_call(
        client,
        "chrome_click_element",
        {
            "tabId": tab_id,
            "selector": '(//button[normalize-space(.)=\"继续\" or contains(normalize-space(.), \"Continue\")])[1]',
            "selectorType": "xpath",
            "timeout": 3000,
            "waitForNavigation": False,
        },
    )
    if click_resp.get("success") is not True:
        # Fallback: JS click.
        click = _result_dict(
            _js(
                client,
                tab_id,
                """
const norm=(s)=>String(s||'').replace(/\\s+/g,' ').trim().toLowerCase();
const btn = Array.from(document.querySelectorAll('button')).find((b)=> {
  const t=norm(b.textContent);
  return t === 'continue' || t.includes('continue') || t.includes('next') || t.includes('继续') || t.includes('下一步');
}) || null;
if (!btn) return { ok: false, reason: 'continue_not_found' };
if (!!btn.disabled) return { ok: false, reason: 'continue_disabled', text: String(btn.textContent||'').trim() };
btn.click();
return { ok: true };
""",
                max_output_bytes=20000,
            )
        )
        if not click.get("ok"):
            raise RuntimeError(f"continue click failed: {click}")


def _wait_for_turnstile_token_encoded(
    client: StreamableHttpMCPClient, tab_id: int, timeout_s: float, click_if_empty: bool = True
) -> str:
    deadline = time.time() + float(timeout_s)
    clicked = False
    while time.time() < deadline:
        data = _result_dict(
            _js(
                client,
                tab_id,
                """
const el = document.querySelector('input[name=\"cf-turnstile-response\"]');
const token = el ? String(el.value || '') : '';
const enc = token ? Array.from(token).map((c) => c.charCodeAt(0)).join('-') : '';
return { found: !!el, len: token.length, encLen: enc.length, enc };
""",
                max_output_bytes=51200,
            )
        )
        token_len = int(data.get("len") or 0)
        enc = str(data.get("enc") or "")
        if token_len > 0 and enc:
            try:
                token = "".join(chr(int(x)) for x in enc.split("-") if x)
            except Exception:
                token = ""
            if token and len(token) == token_len:
                return token

        if not clicked and click_if_empty:
            # Best-effort click the turnstile container once.
            rect = _result_dict(
                _js(
                    client,
                    tab_id,
                    """
const hasRect = (el) => { try { const r = el.getBoundingClientRect(); return !!r && r.width > 2 && r.height > 2; } catch (_) { return false; } };
const container = document.querySelector('[data-testid=\"turnstile-container\"]') || document.querySelector('.cf-turnstile') || null;
if (!container || !hasRect(container)) return { ok: false };
try { container.scrollIntoView({ block: 'center' }); } catch (_) {}
const r = container.getBoundingClientRect();
return { ok: true, x: r.left + r.width/2, y: r.top + r.height/2 };
""",
                    max_output_bytes=20000,
                )
            )
            if rect.get("ok"):
                _safe_tool_call(
                    client,
                    "chrome_computer",
                    {"tabId": tab_id, "action": "left_click", "coordinates": {"x": float(rect["x"]), "y": float(rect["y"])}},
                )
                clicked = True

        time.sleep(0.8)
    raise RuntimeError("turnstile token not available (timeout)")


def _wait_for_step2(client: StreamableHttpMCPClient, tab_id: int, timeout_s: float) -> None:
    deadline = time.time() + float(timeout_s)
    last = ""
    while time.time() < deadline:
        state = _result_dict(
            _js(
                client,
                tab_id,
                """
const hasRect = (el) => { try { const r=el.getBoundingClientRect(); return r && r.width>2 && r.height>2; } catch { return false; } };
const verifyBox = document.querySelector('label.verifycodebox');
const tokenEl = document.querySelector('input[name=\"cf-turnstile-response\"]');
let step2 = false;
if (verifyBox && hasRect(verifyBox)) step2 = true;
if (tokenEl) step2 = true;
return { ok: true, path: location.pathname, step2, hasVerifyBox: !!verifyBox, hasTokenEl: !!tokenEl };
""",
                max_output_bytes=20000,
            )
        )
        stage = "step2" if bool(state.get("step2")) else "not_step2"
        if stage == "step2":
            return
        if stage != last:
            _safe_print(f"[mcp] waiting step2 (now={stage})")
            last = stage
        time.sleep(0.6)
    raise RuntimeError("atoms step2 not reached (timeout)")


def _goto_step2_via_browser(
    client: StreamableHttpMCPClient,
    tab_id: int,
    username: str,
    email: str,
    password: str,
    wait_step1_s: float,
    wait_step2_s: float,
    keep_login_state: bool,
) -> None:
    if not keep_login_state:
        _maybe_clear_atoms_site_data(client, tab_id)

    _safe_tool_call(
        client,
        "chrome_navigate",
        {"tabId": tab_id, "url": ATOMS_REGISTER_URL, "background": False},
    )
    _wait_for_step1(client, tab_id, timeout_s=wait_step1_s)
    _fill_step1_and_continue(client, tab_id, username=username, email=email, password=password)
    _wait_for_step2(client, tab_id, timeout_s=wait_step2_s)


def _get_turnstile_token_from_step2(
    client: StreamableHttpMCPClient, tab_id: int, wait_token_s: float
) -> str:
    return _wait_for_turnstile_token_encoded(client, tab_id, timeout_s=wait_token_s, click_if_empty=True)


def _wait_register_home(client: StreamableHttpMCPClient, tab_id: int, timeout_s: float) -> None:
    deadline = time.time() + float(timeout_s)
    while time.time() < deadline:
        state = _result_dict(
            _js(
                client,
                tab_id,
                """
const emailInput =
  document.querySelector('input[placeholder*="邮箱"]') ||
  document.querySelector('input[placeholder*="电子邮件"]') ||
  document.querySelector('input[type="email"]') ||
  document.querySelector('input[type="text"]');
return {
  path: location.pathname,
  hasEmailInput: !!emailInput
};
""",
                max_output_bytes=20000,
            )
        )
        if bool(state.get("hasEmailInput")):
            return
        time.sleep(0.5)
    raise RuntimeError("register home page not ready")


def _inject_turnstile_probe(client: StreamableHttpMCPClient, tab_id: int, sitekey: str) -> Dict[str, Any]:
    code = f"""
const SITEKEY = {json.dumps(sitekey)};
window.__tsprobe = window.__tsprobe || {{ token:'', events:[], widgetId:null }};
const probe = window.__tsprobe;

const old = document.getElementById('ts-probe-panel');
if (old) old.remove();

const panel = document.createElement('div');
panel.id = 'ts-probe-panel';
panel.style.cssText = 'position:fixed;z-index:2147483647;left:12px;bottom:12px;background:#111;color:#fff;padding:10px;border-radius:10px;font:12px/1.4 monospace;box-shadow:0 4px 18px rgba(0,0,0,.35);max-width:360px';
panel.innerHTML = '<div style="margin-bottom:8px">TS Probe (script)</div><div id="ts-probe-widget" style="min-height:74px"></div><div id="ts-probe-status" style="margin-top:6px;color:#9fe870">init...</div>';
document.body.appendChild(panel);

const statusEl = document.getElementById('ts-probe-status');
const setStatus = (s) => {{ if (statusEl) statusEl.textContent = String(s || ''); }};

function bindInput(el) {{
  const push = (src) => {{
    const v = String(el.value || '');
    if (v) {{
      probe.token = v;
      probe.events.push({{ src, len: v.length, ts: Date.now() }});
      setStatus('token ' + v.length + ' (' + src + ')');
    }}
  }};
  push('initial');
  el.addEventListener('input', () => push('input'));
  el.addEventListener('change', () => push('change'));
}}

function observeTokenInput() {{
  const existed = document.querySelector('input[name="cf-turnstile-response"]');
  if (existed) {{
    bindInput(existed);
    return true;
  }}
  const mo = new MutationObserver(() => {{
    const el = document.querySelector('input[name="cf-turnstile-response"]');
    if (el) {{
      bindInput(el);
      mo.disconnect();
    }}
  }});
  mo.observe(document.documentElement, {{ childList: true, subtree: true }});
  return false;
}}

function render() {{
  const host = document.getElementById('ts-probe-widget');
  if (!host || typeof window.turnstile === 'undefined') return {{ ok:false, reason:'turnstile_missing' }};
  host.innerHTML = '';
  try {{
    const id = window.turnstile.render(host, {{
      sitekey: SITEKEY,
      theme: 'light',
      size: 'normal',
      callback: (token) => {{
        const v = String(token || '');
        probe.token = v;
        probe.events.push({{ src:'callback', len:v.length, ts:Date.now() }});
        setStatus('token ' + v.length + ' (callback)');
      }},
      'expired-callback': () => {{
        setStatus('expired');
        probe.events.push({{ src:'expired', len:0, ts:Date.now() }});
      }},
      'error-callback': (e) => {{
        setStatus('error ' + String(e || ''));
        probe.events.push({{ src:'error', err:String(e || ''), ts:Date.now() }});
      }}
    }});
    probe.widgetId = id;
    setStatus('rendered; waiting click');
    return {{ ok:true, widgetId:id }};
  }} catch (e) {{
    return {{ ok:false, reason:String(e) }};
  }}
}}

async function ensureScript() {{
  if (typeof window.turnstile !== 'undefined') return 'already';
  await new Promise((resolve, reject) => {{
    const oldScript = document.querySelector('script[data-ts-probe="1"]');
    if (oldScript) {{
      oldScript.addEventListener('load', () => resolve(), {{ once:true }});
      oldScript.addEventListener('error', () => reject(new Error('load_error_existing')), {{ once:true }});
      return;
    }}
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-ts-probe', '1');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load_error_new'));
    document.head.appendChild(s);
  }});
  return 'loaded';
}}

const hookedImmediate = observeTokenInput();
let scriptState = 'unknown';
try {{ scriptState = await ensureScript(); }} catch (e) {{ scriptState = 'error:' + String(e); }}
const rendered = render();
return {{
  ok:true,
  scriptState,
  hookedImmediate,
  rendered,
  tokenLen: String(probe.token || '').length,
  events: (probe.events || []).slice(-5)
}};
"""
    return _result_dict(_js(client, tab_id, code, max_output_bytes=120000))


def _read_turnstile_probe_state(client: StreamableHttpMCPClient, tab_id: int) -> Dict[str, Any]:
    return _result_dict(
        _js(
            client,
            tab_id,
            """
const p = window.__tsprobe || {};
const tokenInput = document.querySelector('input[name="cf-turnstile-response"]');
const tokenA = String(p.token || '');
const tokenB = tokenInput ? String(tokenInput.value || '') : '';
const token = tokenA || tokenB;
return {
  token,
  tokenLen: token.length,
  tokenPrefix: token.slice(0, 24),
  tokenSuffix: token.slice(-24),
  events: (p.events || []).slice(-8)
};
""",
            max_output_bytes=120000,
        )
    )


def _click_by_coordinate_cdp(client: StreamableHttpMCPClient, tab_id: int, x: float, y: float) -> None:
    _safe_tool_call(
        client,
        "chrome_computer",
        {
            "tabId": tab_id,
            "action": "left_click",
            "coordinates": {"x": float(x), "y": float(y)},
            "clickMode": "cdp_only",
            "humanLike": False,
        },
    )


def _get_turnstile_token_injected(
    client: StreamableHttpMCPClient,
    tab_id: int,
    sitekey: str,
    click_x: float,
    click_y: float,
    wait_token_s: float,
    max_clicks: int = 3,
    first_click_delay_s: float = 3.0,
) -> str:
    inject = _inject_turnstile_probe(client, tab_id, sitekey=sitekey)
    _safe_print(f"[mcp] turnstile injected: {inject}")

    deadline = time.time() + float(wait_token_s)
    clicks = 0
    last_click_at = 0.0
    first_click_not_before = time.time() + max(0.0, float(first_click_delay_s))
    if first_click_delay_s > 0:
        _safe_print(f"[mcp] wait {float(first_click_delay_s):.1f}s before first turnstile click")

    while time.time() < deadline:
        state = _read_turnstile_probe_state(client, tab_id)
        token = str(state.get("token") or "")
        token_len = int(state.get("tokenLen") or 0)
        if token_len >= 200 and token:
            return token

        now = time.time()
        if clicks < int(max_clicks) and now >= first_click_not_before and (now - last_click_at) >= 1.2:
            _click_by_coordinate_cdp(client, tab_id, x=click_x, y=click_y)
            clicks += 1
            last_click_at = now
            _safe_print(f"[mcp] clicked turnstile at ({click_x},{click_y}), attempt={clicks}")

        time.sleep(0.6)

    final_state = _read_turnstile_probe_state(client, tab_id)
    raise RuntimeError(f"turnstile token timeout; state={final_state}")


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _append_jsonl(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mcp-url", default="http://127.0.0.1:12306/mcp")
    parser.add_argument(
        "--mcp-url-secondary",
        default="",
        help="Secondary MCP endpoint for parallel workers (workers>=2).",
    )
    parser.add_argument("--mcp-timeout-s", type=float, default=30.0)
    parser.add_argument("--target-url", default=ATOMS_REGISTER_URL)
    parser.add_argument("--tab-id", type=int, default=0, help="reuse existing tab id; 0 means open new")
    parser.add_argument("--window-width", type=int, default=1280)
    parser.add_argument("--window-height", type=int, default=720)

    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--task-retries", type=int, default=1, help="Retries per task (in addition to first try)")

    parser.add_argument("--password", default="@#Dfg55666")
    parser.add_argument("--mail-timeout-s", type=float, default=240.0)
    parser.add_argument("--wait-step1-s", type=float, default=35.0)
    parser.add_argument("--wait-turnstile-s", type=float, default=60.0)
    parser.add_argument("--turnstile-sitekey", default="0x4AAAAAABm2ODs7WKuQtDuP")
    parser.add_argument("--turnstile-click-x", type=float, default=44.0)
    parser.add_argument("--turnstile-click-y", type=float, default=595.0)
    parser.add_argument("--turnstile-max-clicks", type=int, default=3)
    parser.add_argument("--turnstile-first-click-delay-s", type=float, default=4.0)
    parser.add_argument(
        "--turnstile-tabs",
        type=int,
        default=0,
        help="Number of turnstile producer tabs (0 = auto, follow workers).",
    )
    parser.add_argument("--send-magic-link-retries", type=int, default=2)
    parser.add_argument(
        "--send-magic-link-later-retries",
        type=int,
        default=2,
        help="Retries for send-magic-link code=4001 using the same email and captcha.",
    )
    parser.add_argument(
        "--send-magic-link-later-delay-s",
        type=float,
        default=4.0,
        help="Base delay seconds between code=4001 retries.",
    )
    parser.add_argument(
        "--send-magic-link-later-backoff",
        type=float,
        default=1.8,
        help="Backoff multiplier for code=4001 retry delays.",
    )
    parser.add_argument(
        "--send-magic-link-rate-limit-retries",
        type=int,
        default=2,
        help="Retries for send-magic-link code=4429 using the same email and captcha.",
    )
    parser.add_argument(
        "--send-magic-link-rate-limit-delay-s",
        type=float,
        default=12.0,
        help="Base delay seconds between code=4429 retries.",
    )
    parser.add_argument(
        "--send-magic-link-rate-limit-backoff",
        type=float,
        default=2.0,
        help="Backoff multiplier for code=4429 retry delays.",
    )
    parser.add_argument("--http-timeout-s", type=int, default=30)
    parser.add_argument("--impersonate", default=DEFAULT_IMPERSONATE)
    parser.add_argument(
        "--proxy-enabled",
        action="store_true",
        default=True,
        help="Enable HTTP proxy for register/apikey workers (default: enabled).",
    )
    parser.add_argument(
        "--no-proxy-enabled",
        dest="proxy_enabled",
        action="store_false",
        help="Disable HTTP proxy for register/apikey workers.",
    )
    parser.add_argument(
        "--proxy-url",
        default="",
        help="Optional fixed proxy URL, e.g. http://user:pass@host:port",
    )
    parser.add_argument(
        "--proxy-pool",
        default="",
        help="Optional comma-separated proxy URLs. If empty, uses proxy_pool.WORKING_PROXY_ENDPOINTS.",
    )
    parser.add_argument(
        "--proxy-register-enabled",
        action="store_true",
        default=False,
        help="Use proxy on register/send-magic-link flow (default: disabled).",
    )
    parser.add_argument(
        "--proxy-apikey-enabled",
        action="store_true",
        default=True,
        help="Use proxy on apikey/chat flow (default: enabled).",
    )
    parser.add_argument(
        "--no-proxy-apikey-enabled",
        dest="proxy_apikey_enabled",
        action="store_false",
        help="Disable proxy on apikey/chat flow.",
    )
    parser.add_argument("--agent-message-file", default=str(Path(__file__).resolve().parent.parent / "send.md"))
    parser.add_argument("--agent-model", default="auto", help="Deprecated single model fallback; use --apikey-models")
    parser.add_argument(
        "--apikey-models",
        default=DEFAULT_APIKEY_MODELS,
        help="Comma-separated model chain for key extraction retries (new chat per attempt).",
    )
    parser.add_argument(
        "--apikey-chat-attempts",
        type=int,
        default=3,
        help="How many chat sessions to try per JWT when extracting APP_AI_KEY.",
    )
    parser.add_argument("--chat-agent-mode", default="lite", choices=["lite", "full"], help="Mode for chat creation config.agent_mode")
    parser.add_argument("--message-agent-mode", default="lite", help="Mode injected in message metadata.agent_mode")
    parser.add_argument("--agent-timeout-s", type=float, default=60.0, help="Max seconds to wait for assistant output")
    parser.add_argument("--agent-poll-interval-s", type=float, default=3.0)
    parser.add_argument("--agent-first-poll-delay-s", type=float, default=15.0)
    parser.add_argument(
        "--output-key-sha256",
        dest="output_key_sha256",
        action="store_true",
        default=DEFAULT_OUTPUT_KEY_SHA256,
        help="Include APP_AI_KEY_SHA256 in outputs (default: enabled).",
    )
    parser.add_argument(
        "--no-output-key-sha256",
        dest="output_key_sha256",
        action="store_false",
        help="Disable APP_AI_KEY_SHA256 output.",
    )
    parser.add_argument(
        "--keep-login-state",
        action="store_true",
        help="Do not clear atoms.dev browser state before each task",
    )
    parser.add_argument(
        "--keep-session-open",
        action="store_true",
        help="After success, keep process alive so tab/session can be reused immediately",
    )
    parser.add_argument(
        "--keep-session-seconds",
        type=float,
        default=0.0,
        help="When --keep-session-open is set: keep alive for N seconds (0 = until Ctrl+C)",
    )

    parser.add_argument("--output", default=str(Path(__file__).resolve().parent / "atoms_account_key_summary.txt"))
    parser.add_argument(
        "--output-mode",
        default="summary",
        choices=["summary", "json", "jsonl", "dir"],
        help="summary=append account/key hash line only; other modes keep original payload outputs",
    )
    return parser.parse_args()


def _build_mcp_url_pool(args: argparse.Namespace, workers: int) -> list[str]:
    primary = str(args.mcp_url or "").strip()
    secondary = str(args.mcp_url_secondary or "").strip()
    if not primary:
        primary = "http://127.0.0.1:12306/mcp"
    if workers <= 1:
        return [primary]
    if not secondary:
        # Allow one MCP endpoint to host multiple concurrent workers.
        return [primary for _ in range(workers)]
    urls = [primary, secondary]
    return [urls[idx % len(urls)] for idx in range(workers)]


def _extract_tabs_from_snapshot(snapshot: Dict[str, Any]) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    windows = snapshot.get("windows")
    if not isinstance(windows, list):
        return rows
    for window in windows:
        if not isinstance(window, dict):
            continue
        tabs = window.get("tabs")
        if not isinstance(tabs, list):
            continue
        for tab in tabs:
            if not isinstance(tab, dict):
                continue
            try:
                tab_id = int(tab.get("tabId") or 0)
            except Exception:
                tab_id = 0
            if tab_id <= 0:
                continue
            rows.append((tab_id, str(tab.get("url") or "")))
    return rows


def _is_register_url(url: str, target_url: str) -> bool:
    raw = str(url or "")
    if not raw:
        return False
    if "/zh/register" in raw:
        return True
    base_target = str(target_url or "").split("?", 1)[0].rstrip("/")
    base_raw = raw.split("?", 1)[0].rstrip("/")
    return bool(base_target) and base_raw == base_target


def _collect_register_tab_ids(client: StreamableHttpMCPClient, args: argparse.Namespace) -> list[int]:
    snapshot = _safe_tool_call(client, "get_windows_and_tabs", {})
    seen: set[int] = set()
    rows: list[int] = []
    target_url = str(args.target_url)
    for tab_id, url in _extract_tabs_from_snapshot(snapshot):
        if tab_id in seen:
            continue
        if not _is_register_url(url, target_url):
            continue
        seen.add(tab_id)
        rows.append(tab_id)
    return rows


def _open_register_tab(client: StreamableHttpMCPClient, args: argparse.Namespace) -> int:
    target_url = str(args.target_url)
    marker = f"tsw_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
    sep = "&" if "?" in target_url else "?"
    open_url = f"{target_url}{sep}tsw_marker={marker}"

    # Ensure there is an active page to execute window.open from.
    _safe_tool_call(client, "chrome_navigate", {"url": target_url, "background": False})

    before_snapshot = _safe_tool_call(client, "get_windows_and_tabs", {})
    before_ids = {tab_id for tab_id, _ in _extract_tabs_from_snapshot(before_snapshot)}

    opener_code = "window.open(" + json.dumps(open_url) + ", '_blank'); return {ok:true};"
    _safe_tool_call(
        client,
        "chrome_javascript",
        {
            "mode": "functionBody",
            "code": opener_code,
            "failIfFallback": False,
            "allowUnsafeEvalFallback": True,
        },
    )

    deadline = time.time() + 10.0
    while time.time() < deadline:
        snapshot = _safe_tool_call(client, "get_windows_and_tabs", {})
        tabs = _extract_tabs_from_snapshot(snapshot)
        for tab_id, url in tabs:
            if marker in url:
                return tab_id
        for tab_id, url in tabs:
            if tab_id not in before_ids and _is_register_url(url, target_url):
                return tab_id
        time.sleep(0.25)

    nav = client.call_tool_json(
        "chrome_navigate",
        {
            "url": target_url,
            "newWindow": True,
            "width": int(args.window_width),
            "height": int(args.window_height),
        },
    )
    tab_id = int(nav.get("tabId") or 0)
    if tab_id <= 0:
        tabs = nav.get("tabs")
        if isinstance(tabs, list) and tabs:
            first = tabs[0] if isinstance(tabs[0], dict) else {}
            tab_id = int((first or {}).get("tabId") or 0)
    if tab_id <= 0:
        raise RuntimeError(f"unable to open register tab: {nav}")
    return tab_id


def _acquire_turnstile_tab_ids(
    client: StreamableHttpMCPClient, args: argparse.Namespace, desired_tabs: int
) -> list[int]:
    if int(desired_tabs) <= 0:
        return []
    if int(args.tab_id) > 0 and int(desired_tabs) <= 1:
        return [int(args.tab_id)]

    tab_ids = _collect_register_tab_ids(client, args)[: int(desired_tabs)]
    attempts = 0
    max_attempts = max(3, int(desired_tabs) * 4)
    while len(tab_ids) < int(desired_tabs) and attempts < max_attempts:
        attempts += 1
        new_tab = _open_register_tab(client, args)
        if int(new_tab) > 0 and int(new_tab) not in tab_ids:
            tab_ids.append(int(new_tab))
            continue
        # Fallback: refresh existing register tab list and dedupe.
        refreshed = _collect_register_tab_ids(client, args)
        for tab_id in refreshed:
            if tab_id not in tab_ids:
                tab_ids.append(tab_id)
            if len(tab_ids) >= int(desired_tabs):
                break

    if len(tab_ids) < int(desired_tabs):
        raise RuntimeError(f"only got {len(tab_ids)} register tabs, need {int(desired_tabs)}")
    return tab_ids[: int(desired_tabs)]


def _compute_turnstile_token_buffer(reg_workers: int, turnstile_workers: int, count: int) -> tuple[int, int]:
    # Keep a bounded, worker-scaled buffer: enough for burst, small enough to reduce token staleness.
    maxsize = max(1, min(12, max(int(reg_workers), int(turnstile_workers)) + max(1, int(reg_workers) // 2)))
    if int(count) > 0:
        maxsize = min(maxsize, max(1, int(count)))
    fill_target = max(1, min(maxsize, int(reg_workers)))
    return int(maxsize), int(fill_target)


class PipelineState:
    def __init__(self, target_count: int):
        self.target_count = target_count
        self.success_count = 0
        self.failure_count = 0
        self.lock = threading.Lock()
        self.done_event = threading.Event()

    def add_success(self):
        with self.lock:
            self.success_count += 1
            if self.success_count >= self.target_count:
                self.done_event.set()
                
    def add_failure(self):
        with self.lock:
            self.failure_count += 1

def turnstile_worker(
    worker_id: int,
    mcp_url: str,
    args: argparse.Namespace,
    state: PipelineState,
    token_queue: queue.Queue,
    tab_id: int,
    token_fill_target: int,
):
    client = StreamableHttpMCPClient(str(mcp_url), timeout=float(args.mcp_timeout_s))
    try:
        client.initialize()
    except Exception as e:
        _safe_print(f"[Turnstile-{worker_id}] MCP init failed: {e}")
        state.add_failure()
        return

    _safe_print(f"[Turnstile-{worker_id}] tab_id={tab_id}")
    throttled = False
    target = max(1, int(token_fill_target))

    while not state.done_event.is_set():
        try:
            try:
                current_size = int(token_queue.qsize())
            except Exception:
                current_size = 0
            if current_size >= target:
                if not throttled:
                    _safe_print(
                        f"[Turnstile-{worker_id}] buffer high ({current_size}/{token_queue.maxsize}), pause produce"
                    )
                    throttled = True
                time.sleep(0.6)
                continue
            if throttled:
                _safe_print(
                    f"[Turnstile-{worker_id}] buffer drained ({current_size}/{token_queue.maxsize}), resume produce"
                )
                throttled = False

            if not bool(args.keep_login_state):
                _maybe_clear_atoms_site_data(client, tab_id)

            _safe_tool_call(
                client,
                "chrome_navigate",
                {"tabId": tab_id, "url": str(args.target_url), "background": False},
            )
            _wait_register_home(client, tab_id=tab_id, timeout_s=float(args.wait_step1_s))

            captcha = _get_turnstile_token_injected(
                client=client,
                tab_id=tab_id,
                sitekey=str(args.turnstile_sitekey),
                click_x=float(args.turnstile_click_x),
                click_y=float(args.turnstile_click_y),
                wait_token_s=float(args.wait_turnstile_s),
                max_clicks=max(1, int(args.turnstile_max_clicks)),
                first_click_delay_s=float(args.turnstile_first_click_delay_s),
            )
            
            _safe_print(f"[Turnstile-{worker_id}] Produced token (len={len(captcha)})")
            # Loop to put until accepted or done
            while not state.done_event.is_set():
                try:
                    token_queue.put(captcha, timeout=1.0)
                    break
                except queue.Full:
                    continue
        except Exception as e:
            _safe_print(f"[Turnstile-{worker_id}] Error: {e}")
            time.sleep(2)

def register_worker(
    worker_id: int,
    args: argparse.Namespace,
    state: PipelineState,
    token_queue: queue.Queue,
    jwt_queue: queue.Queue,
    proxy_pool: Optional[RotatingProxyPool] = None,
):
    s = c_requests.Session()
    register_proxy_url = _apply_proxy_for_worker_session(
        s,
        worker_kind="Register",
        worker_id=worker_id,
        args=args,
        enabled=bool(args.proxy_register_enabled),
        proxy_pool=proxy_pool,
    )

    while not state.done_event.is_set():
        try:
            captcha = token_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        tokens_taken = 1
        try:
            inbox = MailTMInbox(password=args.password, logger=lambda m: None)
            email = inbox.generate_email()
            password = str(args.password)

            _safe_print(f"[Register-{worker_id}] Using token for {email}")

            refresh_retries = max(0, int(args.send_magic_link_retries))
            later_retries = max(0, int(args.send_magic_link_later_retries))
            later_delay = max(0.5, float(args.send_magic_link_later_delay_s))
            later_backoff = max(1.0, float(args.send_magic_link_later_backoff))
            rate_retries = max(0, int(args.send_magic_link_rate_limit_retries))
            rate_delay = max(1.0, float(args.send_magic_link_rate_limit_delay_s))
            rate_backoff = max(1.0, float(args.send_magic_link_rate_limit_backoff))
            send_magic: Dict[str, Any] = {}
            send_ok = False

            for token_round in range(1, refresh_retries + 2):
                left_4001 = later_retries
                left_4429 = rate_retries
                while True:
                    send_magic = _atoms_send_magic_link(
                        s,
                        email=email,
                        password=password,
                        captcha=captcha,
                        device_fingerprint=KNOWN_GOOD_DEVICE_FINGERPRINT,
                        impersonate=str(args.impersonate),
                        timeout_s=int(args.http_timeout_s),
                        redirect="/",
                    )
                    code = _api_code(send_magic)
                    if code == 0:
                        send_ok = True
                        break
                    if (
                        code in (4001, 4429)
                        and bool(args.proxy_register_enabled)
                        and proxy_pool
                        and register_proxy_url
                        and ((code == 4001 and left_4001 > 0) or (code == 4429 and left_4429 > 0))
                    ):
                        _safe_print(
                            f"[Register-{worker_id}] send-magic-link got {code} with proxy; rotating proxy..."
                        )
                        proxy_pool.mark_bad(register_proxy_url)
                        register_proxy_url = _apply_proxy_for_worker_session(
                            s,
                            worker_kind="Register",
                            worker_id=worker_id,
                            args=args,
                            enabled=bool(args.proxy_register_enabled),
                            proxy_pool=proxy_pool,
                        )
                        if code == 4001:
                            left_4001 -= 1
                        else:
                            left_4429 -= 1
                        # retry immediately with new proxy, bounded by left_4001/left_4429
                        continue

                    if code == 4001 and left_4001 > 0:
                        later_attempt = (later_retries - left_4001) + 1
                        wait_s = later_delay * (later_backoff**max(0, later_attempt - 1))
                        _safe_print(
                            f"[Register-{worker_id}] send-magic-link got 4001, retry same email/token after {wait_s:.1f}s "
                            f"(later_attempt={later_attempt}/{later_retries + 1}, token_round={token_round}/{refresh_retries + 1})"
                        )
                        left_4001 -= 1
                        time.sleep(wait_s)
                        continue

                    if code == 4429 and left_4429 > 0:
                        rate_attempt = (rate_retries - left_4429) + 1
                        wait_s = rate_delay * (rate_backoff**max(0, rate_attempt - 1))
                        _safe_print(
                            f"[Register-{worker_id}] send-magic-link got 4429, retry same email/token after {wait_s:.1f}s "
                            f"(rate_attempt={rate_attempt}/{rate_retries + 1}, token_round={token_round}/{refresh_retries + 1})"
                        )
                        left_4429 -= 1
                        time.sleep(wait_s)
                        continue
                    break

                if send_ok:
                    break

                code = _api_code(send_magic)
                if code in (5007, 4001, 4429) and token_round < (refresh_retries + 1):
                    _safe_print(
                        f"[Register-{worker_id}] send-magic-link code={code}, retrying with fresh turnstile token "
                        f"(token_round={token_round}/{refresh_retries + 1})"
                    )
                    try:
                        captcha = token_queue.get(timeout=10.0)
                        tokens_taken += 1
                    except queue.Empty:
                        break
                    continue
                break

            if not send_ok:
                _safe_print(f"[Register-{worker_id}] send_magic failed: {send_magic}")
                state.add_failure()
                continue

            verification_token = inbox.wait_for_verification_token(timeout_s=float(args.mail_timeout_s), debug=False)
            if not verification_token:
                _safe_print(f"[Register-{worker_id}] verification token missing")
                state.add_failure()
                continue

            verified = _atoms_verify_magic_link(
                s,
                email=email,
                verification_token=verification_token,
                impersonate=str(args.impersonate),
                timeout_s=int(args.http_timeout_s),
            )
            
            if _api_code(verified) != 0:
                _safe_print(f"[Register-{worker_id}] verify magic link failed: {verified}")
                state.add_failure()
                continue

            verified_data = verified.get("data") if isinstance(verified.get("data"), dict) else {}
            token = str((verified_data or {}).get("token") or "").strip()
            
            if not token:
                state.add_failure()
                continue

            jwt_info = {
                "email": email,
                "password": password,
                "token": token,
                "jwt": token,
                "balance": _atoms_balance(s, token=token, impersonate=str(args.impersonate), timeout_s=int(args.http_timeout_s))
            }
            
            _safe_print(f"[Register-{worker_id}] Generated JWT for {email}")
            while not state.done_event.is_set():
                try:
                    jwt_queue.put(jwt_info, timeout=1.0)
                    break
                except queue.Full:
                    continue

        except Exception as e:
            _safe_print(f"[Register-{worker_id}] Error: {e}")
            state.add_failure()
        finally:
            for _ in range(tokens_taken):
                token_queue.task_done()

def apikey_worker(
    worker_id: int,
    args: argparse.Namespace,
    state: PipelineState,
    jwt_queue: queue.Queue,
    output_path: Path,
    output_mode: str,
    proxy_pool: Optional[RotatingProxyPool] = None,
):
    s = c_requests.Session()
    apikey_proxy_url = _apply_proxy_for_worker_session(
        s,
        worker_kind="APIKey",
        worker_id=worker_id,
        args=args,
        enabled=bool(args.proxy_apikey_enabled),
        proxy_pool=proxy_pool,
    )

    try:
        message_file = Path(str(args.agent_message_file)).expanduser().resolve()
        prompt = message_file.read_text(encoding="utf-8")
    except Exception as e:
        _safe_print(f"[APIKey-{worker_id}] Failed to read prompt: {e}")
        state.done_event.set()
        return

    model_chain = _parse_apikey_models(str(args.apikey_models))
    if not model_chain:
        fallback_model = str(args.agent_model or "").strip()
        model_chain = (
            [fallback_model] if fallback_model else _parse_apikey_models(DEFAULT_APIKEY_MODELS)
        )
    max_chat_attempts = max(1, int(args.apikey_chat_attempts))
    _safe_print(
        f"[APIKey-{worker_id}] model_chain={model_chain} max_chat_attempts={max_chat_attempts}"
    )

    while not state.done_event.is_set():
        try:
            jwt_info = jwt_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        try:
            token = jwt_info["token"]
            email = str(jwt_info.get("email") or "")
            chat_id = ""
            used_model = ""
            last_error = ""

            workspace_id = _atoms_get_workspace_id(
                s=s,
                token=token,
                impersonate=str(args.impersonate),
                timeout_s=int(args.http_timeout_s),
            )
            app_ai_key = ""

            for chat_attempt in range(1, max_chat_attempts + 1):
                if state.done_event.is_set():
                    break
                model = model_chain[(chat_attempt - 1) % len(model_chain)]
                used_model = model
                try:
                    _safe_print(
                        f"[APIKey-{worker_id}] email={email} chat_attempt={chat_attempt}/{max_chat_attempts} model={model}"
                    )
                    chat_id = _atoms_create_chat(
                        s=s,
                        token=token,
                        model=str(model),
                        chat_agent_mode=str(args.chat_agent_mode),
                        workspace_id=int(workspace_id),
                        impersonate=str(args.impersonate),
                        timeout_s=int(args.http_timeout_s),
                    )

                    sent = _atoms_send_chat_message(
                        s=s,
                        token=token,
                        chat_id=chat_id,
                        message=prompt,
                        message_agent_mode=str(args.message_agent_mode),
                        default_model=str(model),
                        impersonate=str(args.impersonate),
                        timeout_s=int(args.http_timeout_s),
                    )

                    if _api_code(sent) != 0:
                        code = _api_code(sent)
                        if (
                            code in (4001, 4429)
                            and bool(args.proxy_apikey_enabled)
                            and proxy_pool
                            and apikey_proxy_url
                        ):
                            _safe_print(f"[APIKey-{worker_id}] chat message hit {code}; rotating proxy...")
                            proxy_pool.mark_bad(apikey_proxy_url)
                            apikey_proxy_url = _apply_proxy_for_worker_session(
                                s,
                                worker_kind="APIKey",
                                worker_id=worker_id,
                                args=args,
                                enabled=bool(args.proxy_apikey_enabled),
                                proxy_pool=proxy_pool,
                            )
                        raise RuntimeError(f"send chat message failed: {sent}")

                    app_ai_key = _poll_app_ai_key_from_chat(
                        s=s,
                        token=token,
                        chat_id=chat_id,
                        timeout_s=float(args.agent_timeout_s),
                        poll_interval_s=float(args.agent_poll_interval_s),
                        first_poll_delay_s=float(args.agent_first_poll_delay_s),
                        impersonate=str(args.impersonate),
                        http_timeout_s=int(args.http_timeout_s),
                    )
                    if app_ai_key:
                        break
                    raise RuntimeError(f"app_ai_key not found for chat_id={chat_id}")
                except Exception as attempt_error:
                    last_error = str(attempt_error)
                    _safe_print(
                        f"[APIKey-{worker_id}] chat_attempt={chat_attempt} failed model={model}: {attempt_error}"
                    )
                    app_ai_key = ""
                    continue

            if not app_ai_key:
                raise RuntimeError(
                    f"app_ai_key not found after {max_chat_attempts} chats; last_error={last_error}"
                )

            jwt_info.update({
                "provider_type": "atoms",
                "success": True,
                "app_id": chat_id,
                "chat_id": chat_id,
                "model_used": used_model,
                "app_ai_key": app_ai_key,
                "app_ai_key_masked": _mask_secret(app_ai_key),
                "app_ai_key_sha256": _sha256_hex(app_ai_key) if bool(args.output_key_sha256) else ""
            })

            with state.lock:
                if state.success_count >= state.target_count:
                    break
                task_id = state.success_count + 1
                state.success_count += 1
                
                if output_mode == "dir":
                    saved = output_path / f"atoms_{task_id:03d}.json"
                    _write_json(saved, jwt_info)
                elif output_mode == "jsonl":
                    _append_jsonl(output_path, jwt_info)
                elif output_mode == "summary":
                    _append_summary_text(output_path, jwt_info, task_id=task_id)
                else:
                    _write_json(output_path, jwt_info)
                    
                _safe_print(f"[APIKey-{worker_id}] Task {task_id} success! Key: {jwt_info['app_ai_key_masked']}")
                _emit_task_result(task_id, jwt_info)
                
                if state.success_count >= state.target_count:
                    state.done_event.set()

        except Exception as e:
            _safe_print(f"[APIKey-{worker_id}] Error: {e}")
            if isinstance(jwt_info, dict) and str(jwt_info.get("token") or "").strip():
                failed_payload = dict(jwt_info)
                failed_payload.update(
                    {
                        "provider_type": "atoms",
                        "success": False,
                        "app_id": str(chat_id or ""),
                        "chat_id": str(chat_id or ""),
                        "model_used": str(used_model or ""),
                        "app_ai_key": "",
                        "app_ai_key_masked": "NOT_FOUND",
                        "app_ai_key_sha256": "",
                        "error": str(e),
                    }
                )
                if output_mode == "summary":
                    _append_summary_text(output_path, failed_payload, task_id=0)
            state.add_failure()
        finally:
            jwt_queue.task_done()

def main() -> int:
    args = _parse_args()
    count = max(1, int(args.count))
    workers = max(1, min(int(args.workers), count))
    mcp_url_pool = _build_mcp_url_pool(args, workers)

    output_mode = str(args.output_mode or "summary").strip().lower() or "summary"

    output_path = Path(args.output).expanduser().resolve()
    if count > 1 and args.output == str(Path(__file__).resolve().parent / "atoms_account_key_summary.txt") and output_mode == "jsonl":
        output_path = Path(__file__).resolve().parent / "atoms_accounts.jsonl"

    if output_mode == "dir":
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    state = PipelineState(target_count=count)

    # Proxy Pool initialization
    shared_proxy_pool: Optional[RotatingProxyPool] = None
    if (
        bool(args.proxy_enabled)
        and not str(args.proxy_url or "").strip()
        and (bool(args.proxy_register_enabled) or bool(args.proxy_apikey_enabled))
    ):
        pool_urls = [x.strip() for x in str(args.proxy_pool or "").split(",") if x.strip()]
        shared_proxy_pool = RotatingProxyPool(urls=pool_urls or working_proxy_urls())

    # Register/API workers
    reg_workers = max(3, workers) if count > 1 else workers
    api_workers = max(3, workers) if count > 1 else workers
    if shared_proxy_pool and bool(args.proxy_register_enabled):
        if len(shared_proxy_pool.urls) > 0 and reg_workers > len(shared_proxy_pool.urls):
            _safe_print(
                f"[Main] reg_workers capped by proxy pool: {reg_workers} -> {len(shared_proxy_pool.urls)}"
            )
            reg_workers = len(shared_proxy_pool.urls)

    # Start pipeline threads
    # Turnstile Producers:
    # Reuse existing register tabs first, then open missing tabs.
    turnstile_threads: list[threading.Thread] = []
    desired_turnstile_tabs = int(args.turnstile_tabs)
    if desired_turnstile_tabs <= 0:
        desired_turnstile_tabs = workers
    if int(args.tab_id) > 0 and count <= 1:
        desired_turnstile_tabs = 1

    try:
        bootstrap_client = StreamableHttpMCPClient(str(mcp_url_pool[0]), timeout=float(args.mcp_timeout_s))
        bootstrap_client.initialize()
        turnstile_tab_ids = _acquire_turnstile_tab_ids(
            bootstrap_client, args, desired_tabs=int(desired_turnstile_tabs)
        )
    except Exception as e:
        _safe_print(f"[Main] failed to prepare turnstile tabs: {e}")
        return 1

    token_queue_size, token_fill_target = _compute_turnstile_token_buffer(
        reg_workers=reg_workers,
        turnstile_workers=len(turnstile_tab_ids),
        count=count,
    )
    # Token buffer is scaled by worker count instead of hard-coded.
    token_queue = queue.Queue(maxsize=int(token_queue_size))
    jwt_queue = queue.Queue(maxsize=10)

    _safe_print(f"[Main] turnstile tabs={turnstile_tab_ids}")
    _safe_print(f"[Main] turnstile token buffer maxsize={token_queue_size} fill_target={token_fill_target}")
    turnstile_mcp_urls = [mcp_url_pool[idx % len(mcp_url_pool)] for idx in range(len(turnstile_tab_ids))]
    for i, tab_id in enumerate(turnstile_tab_ids):
        mcp_url = turnstile_mcp_urls[i]
        thread = threading.Thread(
            target=turnstile_worker,
            args=(i + 1, mcp_url, args, state, token_queue, int(tab_id), int(token_fill_target)),
            daemon=True,
        )
        thread.start()
        turnstile_threads.append(thread)

    # Register Consumers/Producers
    # Default to 3 registration threads for concurrency
    for i in range(reg_workers):
        threading.Thread(
            target=register_worker,
            args=(i + 1, args, state, token_queue, jwt_queue, shared_proxy_pool),
            daemon=True,
        ).start()

    # API Key Consumers
    for i in range(api_workers):
        threading.Thread(
            target=apikey_worker,
            args=(i + 1, args, state, jwt_queue, output_path, output_mode, shared_proxy_pool),
            daemon=True,
        ).start()

    # Block main thread until finished
    try:
        while not state.done_event.is_set():
            # If every Turnstile producer has exited and both queues are drained,
            # the pipeline cannot make forward progress anymore.
            if (
                state.success_count < state.target_count
                and turnstile_threads
                and not any(t.is_alive() for t in turnstile_threads)
                and token_queue.empty()
                and jwt_queue.empty()
            ):
                _safe_print("[Main] all turnstile workers exited and queues are empty; stopping early.")
                state.done_event.set()
                break
            time.sleep(1)
            
        _safe_print(f"Done. success={state.success_count} failure={state.failure_count} output={output_path}")
    except KeyboardInterrupt:
        _safe_print("Interrupted by user.")
    
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
