#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, Optional
from urllib.parse import urlparse

from mcp.server.fastmcp import FastMCP

DEEPWIKI_API_URL = "https://api.devin.ai/ada/query"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/146.0.0.0 Safari/537.36"
)
LOCAL_HTTP_PROXY_FALLBACK = "http://127.0.0.1:7897"
PROXY_ENV_KEYS = ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy")
RETRYABLE_HTTP_STATUS = {429, 500, 502, 503, 504}
HTTP_MAX_ATTEMPTS = 4
HTTP_RETRY_BASE_SECONDS = 1.0
HTTP_RETRY_MAX_SECONDS = 10.0
MODE_SPECS = {
    "fast": {"api_mode": "fast", "search_mode": "fast"},
    "deep_research": {"api_mode": "deep", "search_mode": "deep"},
    "codemap": {"api_mode": "codemap", "search_mode": "codemap"},
}
MODE_ALIASES = {
    "ask": "fast",
    "deepwiki": "fast",
    "deep_wiki": "fast",
    "default": "fast",
    "normal": "fast",
    "deep": "deep_research",
    "deepresearch": "deep_research",
    "research": "deep_research",
    "code_map": "codemap",
}
DEFAULT_MODE = "fast"


def _normalize_mode(mode: str) -> str:
    normalized = str(mode or "").strip().lower().replace("-", "_").replace(" ", "_")
    key = MODE_ALIASES.get(normalized, normalized)
    if key in MODE_SPECS:
        return key
    return DEFAULT_MODE


def _normalize_proxy_url(proxy_url: Optional[str]) -> Optional[str]:
    raw = str(proxy_url or "").strip()
    if not raw:
        for key in PROXY_ENV_KEYS:
            value = str(os.environ.get(key, "")).strip()
            if value:
                raw = value
                break
    if not raw:
        return None
    lowered = raw.lower()
    if lowered in {"none", "off", "disable", "disabled", "direct"}:
        return None
    port_only = re.fullmatch(r"\d{2,5}", raw)
    if port_only:
        return f"http://127.0.0.1:{raw}"
    http_port = re.fullmatch(r"http\s+(\d{2,5})", lowered)
    if http_port:
        return f"http://127.0.0.1:{http_port.group(1)}"
    if "://" not in raw:
        return f"http://{raw}"
    return raw


def _http_proxy_candidates() -> list[Optional[str]]:
    normalized = _normalize_proxy_url(None)
    if normalized:
        return [normalized]
    return [LOCAL_HTTP_PROXY_FALLBACK]


def _build_url_opener(proxy_url: Optional[str]) -> urllib.request.OpenerDirector:
    if proxy_url:
        handler = urllib.request.ProxyHandler({"http": proxy_url, "https": proxy_url})
        return urllib.request.build_opener(handler)
    return urllib.request.build_opener()


def _parse_retry_after_seconds(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        seconds = float(value.strip())
    except (TypeError, ValueError):
        return None
    if seconds < 0:
        return None
    return min(seconds, HTTP_RETRY_MAX_SECONDS)


def _retry_sleep_seconds(attempt: int, retry_after: Optional[float]) -> float:
    if retry_after is not None:
        return retry_after
    exp = HTTP_RETRY_BASE_SECONDS * (2 ** max(0, attempt - 1))
    return min(exp, HTTP_RETRY_MAX_SECONDS)


def _is_retryable_http_error(error: urllib.error.HTTPError) -> bool:
    return int(error.code) in RETRYABLE_HTTP_STATUS


def _repo_name(repo_url: str) -> str:
    parts = [part for part in urlparse(repo_url).path.split("/") if part]
    if len(parts) < 2:
        raise ValueError(f"Invalid DeepWiki repository URL: {repo_url}")
    return "/".join(parts[-2:])


def _repo_page_title(repo_url: str) -> str:
    return f"{_repo_name(repo_url)} | DeepWiki"


def _build_query_id(question: str) -> str:
    slug = re.sub(r"[^a-z0-9\s]", "", question.lower())
    slug = re.sub(r"\s+", "-", slug).strip("-")[:30] or "query"
    return f"{slug}_{uuid.uuid4()}"


def _build_user_query(repo_url: str, question: str) -> str:
    context = f"This query was sent from the wiki page: {_repo_page_title(repo_url)}."
    return f"<relevant_context>{context}</relevant_context>{question}"


def _api_headers(repo_url: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://deepwiki.com",
        "Referer": repo_url,
        "User-Agent": DEFAULT_USER_AGENT,
    }


def _request_json(
    url: str,
    timeout_s: float,
    method: str = "GET",
    payload: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
    proxy_url: Optional[str] = None,
) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    opener = _build_url_opener(proxy_url)
    with opener.open(request, timeout=timeout_s) as response:
        data = json.load(response)
    if not isinstance(data, dict):
        raise RuntimeError(f"Unexpected JSON payload from {url}: {type(data).__name__}")
    return data


def _submit_http_query(
    repo_url: str,
    question: str,
    mode: str,
    timeout_s: float,
    proxy_url: Optional[str] = None,
) -> dict[str, str]:
    spec = MODE_SPECS[mode]
    query_id = _build_query_id(question)
    payload = {
        "mode": spec["api_mode"],
        "user_query": _build_user_query(repo_url, question),
        "keywords": [],
        "repo_names": [_repo_name(repo_url)],
        "additional_context": "",
        "query_id": query_id,
        "use_notes": False,
        "generate_summary": False,
        "source": "ada.deepwiki_public",
    }
    data = _request_json(
        DEEPWIKI_API_URL,
        timeout_s,
        method="POST",
        payload=payload,
        headers=_api_headers(repo_url),
        proxy_url=proxy_url,
    )
    if data.get("status") != "success":
        raise RuntimeError(f"DeepWiki query creation failed: {json.dumps(data, ensure_ascii=False)}")
    return {
        "query_id": query_id,
        "search_url": f"https://deepwiki.com/search/{query_id}?mode={spec['search_mode']}",
        "api_url": f"{DEEPWIKI_API_URL}/{query_id}",
    }


def _extract_answer(data: dict[str, Any]) -> tuple[str, str]:
    query = (data.get("queries") or [{}])[0]
    if query.get("error"):
        raise RuntimeError(str(query["error"]))
    chunks = [item.get("data", "") for item in query.get("response", []) if item.get("type") == "chunk"]
    return str(query.get("state", "")), "".join(chunks).strip()


def _poll_http_answer(
    repo_url: str,
    api_url: str,
    timeout_s: float,
    proxy_url: Optional[str] = None,
) -> str:
    deadline = time.time() + timeout_s
    last_error: Optional[Exception] = None
    while time.time() < deadline:
        try:
            data = _request_json(api_url, timeout_s, headers=_api_headers(repo_url), proxy_url=proxy_url)
            state, answer = _extract_answer(data)
        except urllib.error.HTTPError as error:
            last_error = error
            retry_after = _parse_retry_after_seconds(error.headers.get("Retry-After"))
            time.sleep(_retry_sleep_seconds(1, retry_after))
            continue
        except (urllib.error.URLError, RuntimeError, TimeoutError, OSError) as error:
            last_error = error
            time.sleep(1.0)
            continue
        if state == "done":
            return answer
        time.sleep(1.0)
    message = "Timed out waiting for DeepWiki API result"
    if last_error:
        raise TimeoutError(f"{message}: {last_error}") from last_error
    raise TimeoutError(message)


def _run_http_query(
    repo_url: str,
    question: str,
    mode: str,
    timeout_s: float,
) -> dict[str, Any]:
    last_error: Optional[Exception] = None
    for candidate in _http_proxy_candidates():
        for attempt in range(1, HTTP_MAX_ATTEMPTS + 1):
            try:
                query_meta = _submit_http_query(repo_url, question, mode, timeout_s, candidate)
                answer = _poll_http_answer(repo_url, query_meta["api_url"], timeout_s, candidate)
                result: dict[str, Any] = {
                    "repo_url": repo_url,
                    "mode": mode,
                    "query_id": query_meta["query_id"],
                    "search_url": query_meta["search_url"],
                    "api_url": query_meta["api_url"],
                    "answer_source": "api",
                    "transport_used": "http",
                    "answer": answer,
                }
                if candidate:
                    result["http_proxy_used"] = candidate
                if attempt > 1:
                    result["http_attempts"] = attempt
                return result
            except urllib.error.HTTPError as error:
                last_error = error
                if not _is_retryable_http_error(error) or attempt >= HTTP_MAX_ATTEMPTS:
                    break
                retry_after = _parse_retry_after_seconds(error.headers.get("Retry-After"))
                time.sleep(_retry_sleep_seconds(attempt, retry_after))
            except (TimeoutError, urllib.error.URLError, OSError) as error:
                last_error = error
                if attempt >= HTTP_MAX_ATTEMPTS:
                    break
                time.sleep(_retry_sleep_seconds(attempt, None))
    if last_error:
        raise last_error
    raise TimeoutError("Timed out waiting for DeepWiki API result")


def _resolve_timeout_seconds(mode: str, timeout_s: Optional[float]) -> float:
    if timeout_s is not None:
        return float(timeout_s)
    if mode == "deep_research":
        return 300.0
    return 120.0


def ask_deepwiki_query(
    repo_url: str,
    question: str,
    mode: str = "fast",
    timeout_s: Optional[float] = None,
) -> dict[str, Any]:
    mode_key = _normalize_mode(mode)
    timeout_seconds = _resolve_timeout_seconds(mode_key, timeout_s)
    return _run_http_query(repo_url, question, mode_key, timeout_seconds)


mcp = FastMCP(
    "askGitHub",
    instructions="Ask DeepWiki (GitHub repo wiki) through HTTP only.",
)


@mcp.tool(name="askGitHub")
def askgithub(
    repo_url: str,
    question: str,
    mode: str = "fast",
    timeout_s: Optional[float] = None,
) -> str:
    result = ask_deepwiki_query(
        repo_url,
        question,
        mode,
        timeout_s,
    )
    return str(result.get("answer", "")).strip()


if __name__ == "__main__":
    mcp.run(transport="stdio")
