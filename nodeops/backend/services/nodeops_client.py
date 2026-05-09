"""
NodeOps CreateOS API client.

Four-layer architecture:
  1. Auth       — oneclick-backend.nodeops.xyz
  2. Credits    — api-createos.nodeops.network
  3. Control    — stage-vibe-coder-api.nodeops.xyz
  4. Runtime    — dynamic *.orak.nodeops.app
"""
import httpx
import asyncio
import logging
from typing import AsyncIterator

logger = logging.getLogger(__name__)

AUTH_BASE = "https://oneclick-backend.nodeops.xyz/api/v1"
CREDITS_BASE = "https://api-createos.nodeops.network/v1"
CONTROL_BASE = "https://stage-vibe-coder-api.nodeops.xyz/api/v1"

COMMON_HEADERS = {
    "Content-Type": "application/json",
    "ReferralURL": "https://nodeops.network",
}

# Shared httpx client (reuse connections)
_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


async def close_client():
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


# ─── Helpers ────────────────────────────────────────────────────────

def _auth_headers(auth_token: str) -> dict:
    return {**COMMON_HEADERS, "X-Auth-Token": auth_token}


def _runtime_headers(project_token: str, auth_token: str) -> dict:
    return {
        "Content-Type": "application/json",
        "x-project-token": project_token,
        "y-gg-token": auth_token,
    }


async def _retry_request(method: str, url: str, retries: int = 3, **kwargs) -> httpx.Response:
    """Execute HTTP request with exponential backoff retry on 5xx."""
    client = get_client()
    last_exc = None
    for attempt in range(retries):
        try:
            resp = await client.request(method, url, **kwargs)
            if resp.status_code < 500:
                return resp
            last_exc = Exception(f"HTTP {resp.status_code}: {resp.text[:200]}")
            logger.warning(f"Retry {attempt+1}/{retries} for {method} {url}: {resp.status_code}")
        except httpx.HTTPError as e:
            last_exc = e
            logger.warning(f"Retry {attempt+1}/{retries} for {method} {url}: {e}")
        if attempt < retries - 1:
            await asyncio.sleep(2 ** attempt)
    raise last_exc


# ─── 1. Auth Layer ──────────────────────────────────────────────────

async def login(email: str) -> dict:
    """POST /api/v1/login — trigger OTP email."""
    resp = await _retry_request("POST", f"{AUTH_BASE}/login",
                                headers=COMMON_HEADERS,
                                json={"email": email})
    resp.raise_for_status()
    return resp.json()


async def verify_otp(email: str, code: str) -> dict:
    """POST /api/v1/login/verify — verify OTP, returns auth_token."""
    resp = await _retry_request("POST", f"{AUTH_BASE}/login/verify",
                                headers=COMMON_HEADERS,
                                json={"email": email, "code": code})
    resp.raise_for_status()
    return resp.json()


# ─── 2. Credits Layer ───────────────────────────────────────────────

async def get_credits(auth_token: str) -> dict:
    """GET /v1/credits — returns credit balance. Has intermittent 500s, retried."""
    resp = await _retry_request("GET", f"{CREDITS_BASE}/credits",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


async def get_topup_settings(auth_token: str) -> dict:
    resp = await _retry_request("GET", f"{CREDITS_BASE}/credits/openrouter/topup-settings",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


async def topup_credits(auth_token: str, payload: dict) -> dict:
    resp = await _retry_request("POST", f"{CREDITS_BASE}/credits/openrouter",
                                headers=_auth_headers(auth_token),
                                json=payload)
    resp.raise_for_status()
    return resp.json()


async def get_credit_conversion_rate(auth_token: str) -> dict:
    resp = await _retry_request("GET", f"{CREDITS_BASE}/payments/credit-conversion-rate",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


async def get_credit_skus(auth_token: str) -> dict:
    resp = await _retry_request("GET", f"{CREDITS_BASE}/skus/credit",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


# ─── 3. Control Plane ───────────────────────────────────────────────

async def list_deployments(auth_token: str) -> dict:
    """GET /api/v1/deployments — list all deployments."""
    resp = await _retry_request("GET", f"{CONTROL_BASE}/deployments",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


async def create_deployment(auth_token: str) -> dict:
    """POST /api/v1/deployments/pi-agent — create new deployment (201)."""
    resp = await _retry_request("POST", f"{CONTROL_BASE}/deployments/pi-agent",
                                headers=_auth_headers(auth_token),
                                json={})
    if resp.status_code not in (200, 201):
        resp.raise_for_status()
    return resp.json()


async def get_deployment(auth_token: str, deployment_id: str) -> dict:
    """GET /api/v1/deployments/{id} — get deployment details (runtime_host, project_token)."""
    resp = await _retry_request("GET", f"{CONTROL_BASE}/deployments/{deployment_id}",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


async def get_usage(auth_token: str) -> dict:
    """GET /api/v1/usage — get usage/quota info."""
    resp = await _retry_request("GET", f"{CONTROL_BASE}/usage",
                                headers=_auth_headers(auth_token))
    resp.raise_for_status()
    return resp.json()


# ─── 4. Runtime Layer (dynamic host) ────────────────────────────────

async def create_session(runtime_host: str, project_token: str, auth_token: str,
                         title: str | None = None, model: str | None = None) -> dict:
    """POST /session — create a new chat session."""
    body = {}
    if title:
        body["title"] = title
    if model:
        body["model"] = model
    resp = await _retry_request("POST", f"https://{runtime_host}/session",
                                headers=_runtime_headers(project_token, auth_token),
                                json=body)
    resp.raise_for_status()
    return resp.json()


async def list_sessions(runtime_host: str, project_token: str, auth_token: str) -> dict:
    """GET /session — list all sessions."""
    resp = await _retry_request("GET", f"https://{runtime_host}/session",
                                headers=_runtime_headers(project_token, auth_token))
    resp.raise_for_status()
    return resp.json()


async def send_message(runtime_host: str, project_token: str, auth_token: str,
                       session_id: str, text: str,
                       no_reply: bool = False, system: str | None = None,
                       model: str | None = None) -> dict:
    """POST /session/{id}/message — send a message."""
    body = {
        "parts": [{"type": "text", "text": text}],
        "noReply": no_reply,
    }
    if system:
        body["system"] = system
    if model:
        body["model"] = model
    resp = await _retry_request("POST",
                                f"https://{runtime_host}/session/{session_id}/message",
                                headers=_runtime_headers(project_token, auth_token),
                                json=body)
    resp.raise_for_status()
    return resp.json()


async def get_messages(runtime_host: str, project_token: str, auth_token: str,
                       session_id: str) -> dict:
    """GET /session/{id}/message — pull messages."""
    resp = await _retry_request("GET",
                                f"https://{runtime_host}/session/{session_id}/message",
                                headers=_runtime_headers(project_token, auth_token))
    resp.raise_for_status()
    return resp.json()


async def get_session_context(runtime_host: str, project_token: str, auth_token: str,
                              session_id: str) -> dict:
    resp = await _retry_request("GET",
                                f"https://{runtime_host}/session/{session_id}/context",
                                headers=_runtime_headers(project_token, auth_token))
    resp.raise_for_status()
    return resp.json()


async def get_subagents(runtime_host: str, project_token: str, auth_token: str,
                        session_id: str) -> dict:
    resp = await _retry_request("GET",
                                f"https://{runtime_host}/session/{session_id}/subagents",
                                headers=_runtime_headers(project_token, auth_token))
    resp.raise_for_status()
    return resp.json()


async def abort_session(runtime_host: str, project_token: str, auth_token: str,
                        session_id: str) -> dict:
    """POST /session/{id}/abort — abort current generation."""
    resp = await _retry_request("POST",
                                f"https://{runtime_host}/session/{session_id}/abort",
                                headers=_runtime_headers(project_token, auth_token),
                                json={})
    resp.raise_for_status()
    return resp.json()


async def connect_sse(runtime_host: str, token: str,
                      session_id: str) -> AsyncIterator[str]:
    """GET /session/{id}/event?token=... — SSE stream.

    Yields raw SSE lines. Caller parses event/data.
    """
    url = f"https://{runtime_host}/session/{session_id}/event?token={token}"
    client = get_client()
    async with client.stream("GET", url, headers={
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
    }, timeout=None) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            yield line


# ─── Runtime: File operations ───────────────────────────────────────

async def get_file_tree(runtime_host: str, project_token: str, auth_token: str,
                        path: str = "") -> dict:
    """GET /file?path=... — get directory listing."""
    resp = await _retry_request("GET", f"https://{runtime_host}/file",
                                headers=_runtime_headers(project_token, auth_token),
                                params={"path": path})
    resp.raise_for_status()
    return resp.json()


async def get_file_content(runtime_host: str, project_token: str, auth_token: str,
                           path: str) -> bytes:
    """GET /file/content?path=... — get file content as bytes."""
    resp = await _retry_request("GET", f"https://{runtime_host}/file/content",
                                headers=_runtime_headers(project_token, auth_token),
                                params={"path": path})
    resp.raise_for_status()
    return resp.content


async def get_file_status(runtime_host: str, project_token: str, auth_token: str) -> dict:
    """GET /file/status — get workspace file status."""
    resp = await _retry_request("GET", f"https://{runtime_host}/file/status",
                                headers=_runtime_headers(project_token, auth_token))
    resp.raise_for_status()
    return resp.json()


async def get_health(runtime_host: str) -> dict:
    """GET /health — runtime health check."""
    resp = await _retry_request("GET", f"https://{runtime_host}/health")
    resp.raise_for_status()
    return resp.json()


async def request_preview(runtime_host: str, project_token: str, auth_token: str,
                          port: int = 8080) -> dict:
    """POST /preview — request preview URL."""
    resp = await _retry_request("POST", f"https://{runtime_host}/preview",
                                headers=_runtime_headers(project_token, auth_token),
                                json={"port": port})
    resp.raise_for_status()
    return resp.json()
