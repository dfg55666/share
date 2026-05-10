#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from curl_cffi import requests as c_requests


BASE_URL = "https://atoms.dev"
DEFAULT_IMPERSONATE = "chrome120"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_token(raw: str, token_file: str) -> str:
    if raw.strip():
        return raw.strip()
    file_path = Path(token_file).expanduser().resolve()
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    token = str(payload.get("token") or "").strip()
    if not token:
        reg = payload.get("register") or {}
        data = reg.get("data") if isinstance(reg, dict) else {}
        token = str((data or {}).get("token") or "").strip()
    if not token:
        raise RuntimeError(f"token not found in {file_path}")
    return token


def _rid() -> str:
    return f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}"


def _headers(token: str, *, json_body: bool, referer: str = f"{BASE_URL}/") -> Dict[str, str]:
    headers: Dict[str, str] = {
        "Accept": "application/json, text/plain, */*",
        "Authorization": token,
        "Origin": BASE_URL,
        "Referer": referer,
        "X-Locale": "en",
        "X-Request-ID": _rid(),
        "version": "atoms",
    }
    if json_body:
        headers["Content-Type"] = "application/json"
    return headers


def _parse_json(resp: c_requests.Response) -> Dict[str, Any]:
    data: Dict[str, Any]
    try:
        obj = resp.json()
    except Exception:
        obj = {"raw_text": (resp.text or "")[:2000]}
    if isinstance(obj, dict):
        data = obj
    else:
        data = {"raw": obj}
    return {
        "status_code": int(resp.status_code),
        "headers": {
            "content-type": str(resp.headers.get("content-type") or ""),
            "cf-ray": str(resp.headers.get("cf-ray") or ""),
        },
        "body": data,
    }


def get_balance(session: c_requests.Session, token: str, impersonate: str, timeout_s: int) -> Dict[str, Any]:
    resp = session.get(
        f"{BASE_URL}/api/v1/transaction/balance",
        headers=_headers(token, json_body=False),
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _parse_json(resp)


def get_configs(session: c_requests.Session, token: str, impersonate: str, timeout_s: int) -> Dict[str, Any]:
    resp = session.get(
        f"{BASE_URL}/api/v1/configs/general",
        headers=_headers(token, json_body=False),
        timeout=timeout_s,
        impersonate=impersonate,
    )
    return _parse_json(resp)


def create_chat(
    session: c_requests.Session,
    token: str,
    model: str,
    impersonate: str,
    timeout_s: int,
    agent_mode: str = "lite",
) -> Dict[str, Any]:
    payload = {"llm": {"default_model": model}, "config": {"agent_mode": agent_mode}}
    resp = session.post(
        f"{BASE_URL}/api/v1/chats",
        headers=_headers(token, json_body=True),
        json=payload,
        timeout=timeout_s,
        impersonate=impersonate,
    )
    parsed = _parse_json(resp)
    body = parsed.get("body") if isinstance(parsed, dict) else {}
    chat_id = str((((body or {}).get("data") or {}) if isinstance(body, dict) else {}).get("chat_id") or "")
    parsed["chat_id"] = chat_id
    parsed["request"] = payload
    return parsed


def send_message(
    session: c_requests.Session,
    token: str,
    chat_id: str,
    model: str,
    prompt: str,
    impersonate: str,
    timeout_s: int,
    agent_mode: str = "lite",
) -> Dict[str, Any]:
    payload = {
        "content": [{"insert": prompt}],
        "type": "message",
        "metadata": {
            "agent_mode": agent_mode,
            "default_model": model,
            "enable_dr": False,
            "dr_model": "auto",
            "enable_funcsea": False,
        },
        "use_boost": False,
        "use_auto_model": False,
    }
    resp = session.post(
        f"{BASE_URL}/api/v1/chats/{chat_id}/messages",
        headers=_headers(token, json_body=True, referer=f"{BASE_URL}/chat/{chat_id}"),
        json=payload,
        timeout=timeout_s,
        impersonate=impersonate,
    )
    parsed = _parse_json(resp)
    body = parsed.get("body") if isinstance(parsed, dict) else {}
    data = (body or {}).get("data") if isinstance(body, dict) else {}
    user_message_id = int((data or {}).get("id") or 0) if isinstance(data, dict) else 0
    parsed["user_message_id"] = user_message_id
    parsed["request"] = {
        "chat_id": chat_id,
        "model": model,
        "prompt_len": len(prompt),
    }
    return parsed


def poll_final_message(
    session: c_requests.Session,
    token: str,
    chat_id: str,
    impersonate: str,
    timeout_s: float,
    poll_s: float,
    target_refer_id: int = 0,
    min_message_id: int = 0,
) -> Dict[str, Any]:
    deadline = time.time() + float(timeout_s)
    latest: Dict[str, Any] = {}
    while time.time() < deadline:
        resp = session.get(
            f"{BASE_URL}/api/v1/chats/{chat_id}/messages",
            headers=_headers(token, json_body=False, referer=f"{BASE_URL}/chat/{chat_id}"),
            params={"chatId": chat_id, "cur_page": 1, "page_num": 200},
            timeout=30,
            impersonate=impersonate,
        )
        payload = _parse_json(resp)
        latest = payload
        body = payload.get("body") if isinstance(payload, dict) else {}
        data = (body or {}).get("data") if isinstance(body, dict) else {}
        rows = (data or {}).get("data_list") if isinstance(data, dict) else []
        if isinstance(rows, list):
            best: Optional[Dict[str, Any]] = None
            for msg in reversed(rows):
                if not isinstance(msg, dict):
                    continue
                if msg.get("role") != "Engineer":
                    continue
                if msg.get("type") != "message":
                    continue
                msg_id = int(msg.get("id") or 0)
                if min_message_id > 0 and msg_id < min_message_id:
                    continue
                refer_id = int(msg.get("refer_id") or 0)
                if target_refer_id > 0 and refer_id != target_refer_id:
                    continue
                content = msg.get("content")
                if not isinstance(content, list):
                    continue
                parts: List[str] = []
                for item in content:
                    if isinstance(item, dict):
                        text = str(item.get("insert") or "")
                        if text:
                            parts.append(text)
                final_text = "".join(parts).strip()
                if final_text:
                    best = {
                        "found": True,
                        "text": final_text,
                        "message_id": msg_id,
                        "refer_id": refer_id,
                        "poll_payload": payload,
                    }
                    break
            if best is not None:
                return best
        time.sleep(float(poll_s))
    return {"found": False, "poll_payload": latest}


def _shorten(text: str, n: int = 280) -> str:
    if len(text) <= n:
        return text
    return text[:n] + "..."


def _extract_error(body: Dict[str, Any]) -> str:
    if not isinstance(body, dict):
        return ""
    msg = str(body.get("message") or body.get("msg") or "")
    code = body.get("code")
    if code is None:
        return msg
    return f"code={code} message={msg}"


def _score_hard_result(text: str) -> Dict[str, Any]:
    # Expected:
    # det(A)=-27 -> *17=-459, primes<=19 sum=77 => -536
    # 0x3A7F=14975; *13=194675; xor 0b10101010 => 194505 => 2F7C9
    expected_q1 = "-536"
    expected_q2 = "2F7C9"
    out: Dict[str, Any] = {"ok": False, "q1": "", "q2": "", "expected_q1": expected_q1, "expected_q2": expected_q2}
    line = str(text or "").strip()
    m = re.search(r"Q1\s*=\s*([+-]?\d+)\s*;\s*Q2\s*=\s*([0-9A-Fa-f]+)", line)
    if not m:
        return out
    q1 = m.group(1).strip()
    q2 = m.group(2).strip().upper()
    out["q1"] = q1
    out["q2"] = q2
    out["ok"] = q1 == expected_q1 and q2 == expected_q2
    return out


def main() -> int:
    global BASE_URL
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", default="")
    parser.add_argument(
        "--token-file",
        default=str(Path(__file__).resolve().parent / "tmp_register.json"),
    )
    parser.add_argument("--base", default=BASE_URL)
    parser.add_argument("--impersonate", default=DEFAULT_IMPERSONATE)
    parser.add_argument("--timeout-s", type=int, default=45)
    parser.add_argument("--poll-timeout-s", type=float, default=90.0)
    parser.add_argument("--poll-interval-s", type=float, default=2.0)
    parser.add_argument("--insufficient-attempts", type=int, default=20)
    parser.add_argument(
        "--models",
        default="claude-4-5-sonnet,claude-opus-4.5,claude-opus-4.6,gpt-5-mini,gpt-5.2,gpt-5.1,gemini-3-pro-preview",
        help="Comma-separated model ids to probe",
    )
    parser.add_argument(
        "--out",
        default="",
        help="Default: auth/atoms/model_limit_probe_<timestamp>.json",
    )
    args = parser.parse_args()

    token = _load_token(str(args.token), str(args.token_file))
    BASE_URL = str(args.base).rstrip("/")

    s = c_requests.Session()
    run: Dict[str, Any] = {
        "generated_at": _now_iso(),
        "base": BASE_URL,
        "token_suffix": token[-12:] if len(token) > 12 else token,
        "impersonate": str(args.impersonate),
        "balance_before": get_balance(s, token, str(args.impersonate), int(args.timeout_s)),
        "configs_general": get_configs(s, token, str(args.impersonate), int(args.timeout_s)),
        "model_checks": [],
        "context_limit_probe": {},
        "insufficient_probe": [],
        "balance_after": {},
    }

    model_list = [x.strip() for x in str(args.models).split(",") if x.strip()]
    run["models_requested"] = model_list
    model_cases = [(m, f"输出 OK-{m}") for m in model_list]

    hard_prompt = (
        "你是严格的算法助手。请只返回最终答案，不要解释。\n"
        "题目1：A=[2,-1,0;3,4,1;0,5,-2]，计算 det(A)*17- (<=19 的素数和)。\n"
        "题目2：将 0x3A7F 转十进制后乘13，再 XOR 0b10101010，最后转大写十六进制（不含0x）。\n"
        "按格式输出：Q1=<整数>;Q2=<HEX>"
    )

    # Context-limit probe first, to avoid being masked by later request-rate limits.
    long_model = "claude-opus-4.6" if "claude-opus-4.6" in model_list else model_list[0]
    long_chat = create_chat(s, token, long_model, str(args.impersonate), int(args.timeout_s))
    long_chat_id = str(long_chat.get("chat_id") or "")
    run["context_limit_probe"]["create_chat"] = long_chat
    if long_chat_id:
        huge_prompt = "A" * 600000
        long_send = send_message(
            s,
            token,
            chat_id=long_chat_id,
            model=long_model,
            prompt=huge_prompt,
            impersonate=str(args.impersonate),
            timeout_s=int(args.timeout_s),
        )
        run["context_limit_probe"]["send"] = long_send
        run["context_limit_probe"]["send_error"] = _extract_error(
            long_send.get("body") if isinstance(long_send.get("body"), dict) else {}
        )
    else:
        run["context_limit_probe"]["send_error"] = "chat_create_failed"

    for model, ping_text in model_cases:
        row: Dict[str, Any] = {"model": model}
        created = create_chat(s, token, model, str(args.impersonate), int(args.timeout_s))
        row["create_chat"] = created
        chat_id = str(created.get("chat_id") or "")
        if not chat_id:
            row["error"] = _extract_error(created.get("body") if isinstance(created.get("body"), dict) else {})
            run["model_checks"].append(row)
            continue

        ping_prompt = f"请不要解释，直接原样返回：{ping_text}"
        send_ping = send_message(
            s,
            token,
            chat_id=chat_id,
            model=model,
            prompt=ping_prompt,
            impersonate=str(args.impersonate),
            timeout_s=int(args.timeout_s),
        )
        row["send_ping"] = send_ping
        ping_user_id = int(send_ping.get("user_message_id") or 0)

        ping_poll = poll_final_message(
            s,
            token,
            chat_id=chat_id,
            impersonate=str(args.impersonate),
            timeout_s=float(args.poll_timeout_s),
            poll_s=float(args.poll_interval_s),
            target_refer_id=ping_user_id,
        )
        row["ping_result"] = {
            "found": bool(ping_poll.get("found")),
            "text_preview": _shorten(str(ping_poll.get("text") or "")),
            "refer_id": int(ping_poll.get("refer_id") or 0),
        }

        send_hard = send_message(
            s,
            token,
            chat_id=chat_id,
            model=model,
            prompt=hard_prompt,
            impersonate=str(args.impersonate),
            timeout_s=int(args.timeout_s),
        )
        row["send_hard"] = send_hard
        hard_user_id = int(send_hard.get("user_message_id") or 0)
        hard_poll = poll_final_message(
            s,
            token,
            chat_id=chat_id,
            impersonate=str(args.impersonate),
            timeout_s=float(args.poll_timeout_s),
            poll_s=float(args.poll_interval_s),
            target_refer_id=hard_user_id,
        )
        hard_text = str(hard_poll.get("text") or "")
        row["hard_result"] = {
            "found": bool(hard_poll.get("found")),
            "text_preview": _shorten(hard_text, 420),
            "refer_id": int(hard_poll.get("refer_id") or 0),
            "score": _score_hard_result(hard_text),
        }
        run["model_checks"].append(row)
        time.sleep(1.0)

    # Insufficient/budget probe: repeat paid model calls and capture first non-zero failure.
    insuff_model = "claude-opus-4.6"
    for idx in range(1, max(1, int(args.insufficient_attempts)) + 1):
        item: Dict[str, Any] = {"attempt": idx}
        created = create_chat(s, token, insuff_model, str(args.impersonate), int(args.timeout_s))
        item["create_chat"] = {
            "status_code": created.get("status_code"),
            "body": created.get("body"),
            "chat_id": created.get("chat_id"),
        }
        chat_id = str(created.get("chat_id") or "")
        if not chat_id:
            run["insufficient_probe"].append(item)
            break
        prompt = f"第{idx}次请求：返回字符串 ONLY_OK_{idx}"
        sent = send_message(
            s,
            token,
            chat_id=chat_id,
            model=insuff_model,
            prompt=prompt,
            impersonate=str(args.impersonate),
            timeout_s=int(args.timeout_s),
        )
        item["send"] = {
            "status_code": sent.get("status_code"),
            "body": sent.get("body"),
        }
        body = sent.get("body") if isinstance(sent.get("body"), dict) else {}
        code = body.get("code") if isinstance(body, dict) else None
        if code not in (0, None):
            run["insufficient_probe"].append(item)
            break
        poll = poll_final_message(
            s,
            token,
            chat_id=chat_id,
            impersonate=str(args.impersonate),
            timeout_s=30,
            poll_s=2.0,
        )
        item["assistant_preview"] = _shorten(str(poll.get("text") or ""), 120)
        run["insufficient_probe"].append(item)
        # Stop once obvious rate/quota error appears in preview body.
        err = _extract_error(body if isinstance(body, dict) else {})
        if err and "success" not in err.lower():
            break

    run["balance_after"] = get_balance(s, token, str(args.impersonate), int(args.timeout_s))

    out_path = (
        Path(args.out).expanduser().resolve()
        if str(args.out).strip()
        else Path(__file__).resolve().parent / f"model_limit_probe_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(run, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"saved={out_path}")
    print(f"balance_before={json.dumps(run['balance_before'].get('body', {}), ensure_ascii=False)[:220]}")
    print(f"balance_after={json.dumps(run['balance_after'].get('body', {}), ensure_ascii=False)[:220]}")
    for row in run["model_checks"]:
        model = row.get("model")
        ping = row.get("ping_result") or {}
        hard = row.get("hard_result") or {}
        print(
            f"model={model} ping_found={bool(ping.get('found'))} hard_found={bool(hard.get('found'))} "
            f"hard_ok={bool(((hard.get('score') or {}).get('ok')))} "
            f"ping='{_shorten(str(ping.get('text_preview') or ''), 80)}'"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
