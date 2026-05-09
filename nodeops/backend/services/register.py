"""
NodeOps account registration service.

Full flow:
  1. Send OTP  → POST /api/v1/login
  2. Fetch OTP → Gmail IMAP (via GmailIMAPInbox) or manual input
  3. Verify    → POST /api/v1/login/verify  → get X-Auth-Token
  4. (optional) Redeem credits  → POST /v1/credits/openrouter
  5. (optional) Create deployment → POST /api/v1/deployments/pi-agent
  6. (optional) Create session    → POST /session
  7. Save account to pool

Supports:
  - Single manual (provide email + otp)
  - Single Gmail auto (send OTP, poll Gmail inbox, verify)
  - Batch concurrent (multiple accounts via Gmail aliases / Gmail plus-addressing)
"""
from __future__ import annotations

import asyncio
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from backend.services.gmail_imap import GmailIMAPInbox
from backend.services import account_pool
from backend.services import nodeops_client as noc

logger = logging.getLogger(__name__)

AUTH_BASE = "https://oneclick-backend.nodeops.xyz/api/v1"
CREDITS_BASE = "https://api-createos.nodeops.network/v1"
CONTROL_BASE = "https://stage-vibe-coder-api.nodeops.xyz/api/v1"
DEFAULT_CREDIT_SKU_ID = "00000000-0000-0000-0000-000000000007"

_COMMON_HEADERS = {
    "Content-Type": "application/json",
    "ReferralURL": "https://nodeops.network",
    "Accept": "application/json, text/plain, */*",
}

# ──────────────────────────────────────────────────────────────────────────────
# Config dataclasses
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class GmailConfig:
    email: str = "feijidfg55@gmail.com"
    app_password: str = ""          # "maqk srdy ucjq bsby" or env-injected
    imap_host: str = "imap.gmail.com"
    imap_port: int = 993
    proxy_type: str = "http"
    proxy_host: str = "127.0.0.1"
    proxy_port: int = 7897
    lookback_hours: int = 72
    max_mails: int = 120
    delete_best: bool = True
    poll_interval_s: float = 5.0
    otp_timeout_s: int = 180


@dataclass
class RegisterConfig:
    # Whether to automatically redeem platform credits after registration
    redeem_credits: bool = True
    redeem_amount_nodeops: int = 400      # NodeOps credits to redeem
    redeem_chunk_nodeops: int = 100       # chunk size (100 or 250)
    # Whether to create deployment + session after registration
    create_runtime: bool = True
    deployment_prompt: str = "init"
    # HTTP timeout for individual API calls
    http_timeout_s: int = 60


# ──────────────────────────────────────────────────────────────────────────────
# Result types
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class RegisterResult:
    ok: bool
    email: str = ""
    auth_token: str = ""
    uuid_: str = ""
    is_new_user: bool = False
    is_wallet_registered: bool = False
    deployment_id: str = ""
    runtime_host: str = ""
    project_token: str = ""
    session_id: str = ""
    credits_redeemed: float = 0.0
    credits_redeem_ok: bool = False
    runtime_ready: bool = False
    account_id: str = ""        # pool account id after save
    error: str = ""
    detail: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "email": self.email,
            "uuid": self.uuid_,
            "is_new_user": self.is_new_user,
            "is_wallet_registered": self.is_wallet_registered,
            "auth_token_preview": self.auth_token[:20] + "..." if self.auth_token else "",
            "deployment_id": self.deployment_id,
            "runtime_host": self.runtime_host,
            "project_token_preview": self.project_token[:20] + "..." if self.project_token else "",
            "session_id": self.session_id,
            "credits_redeemed": self.credits_redeemed,
            "credits_redeem_ok": self.credits_redeem_ok,
            "runtime_ready": self.runtime_ready,
            "account_id": self.account_id,
            "error": self.error,
            "detail": self.detail,
        }


# ──────────────────────────────────────────────────────────────────────────────
# Low-level HTTP helpers (sync-style using shared httpx.AsyncClient)
# ──────────────────────────────────────────────────────────────────────────────

async def _post(url: str, json_body: dict, extra_headers: dict | None = None, timeout: int = 60) -> dict:
    headers = {**_COMMON_HEADERS, **(extra_headers or {})}
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=json_body)
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text}


async def _get(url: str, extra_headers: dict | None = None, params: dict | None = None, timeout: int = 60) -> dict:
    headers = {**_COMMON_HEADERS, **(extra_headers or {})}
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, headers=headers, params=params or {})
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return {"raw_text": resp.text}


def _auth_hdrs(token: str) -> dict:
    return {"X-Auth-Token": token}


# ──────────────────────────────────────────────────────────────────────────────
# Step 1: Send OTP
# ──────────────────────────────────────────────────────────────────────────────

async def send_otp(email: str, timeout: int = 30) -> dict:
    """POST /api/v1/login — triggers OTP email to `email`."""
    logger.info("[register] send_otp → %s", email)
    return await _post(
        f"{AUTH_BASE}/login",
        {"email": email, "from": "createos"},
        timeout=timeout,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Step 2: Verify OTP
# ──────────────────────────────────────────────────────────────────────────────

async def verify_otp(email: str, otp: str, timeout: int = 30) -> dict:
    """POST /api/v1/login/verify — returns token payload."""
    logger.info("[register] verify_otp → %s otp=%s", email, otp)
    return await _post(
        f"{AUTH_BASE}/login/verify",
        {"email": email, "otp": otp},
        timeout=timeout,
    )


def _extract_token_fields(verify_resp: dict) -> tuple[str, str, bool, bool]:
    """
    Extract (token, uuid, is_new_user, is_wallet_registered) from verify response.
    Handles both flat and nested-under-'data' shapes.
    """
    data = verify_resp.get("data") if isinstance(verify_resp, dict) else None
    if not isinstance(data, dict):
        data = verify_resp
    token = str(data.get("token") or "").strip()
    uid = str(data.get("uuid") or data.get("id") or "").strip()
    is_new = bool(data.get("is_new_user"))
    is_wallet = bool(data.get("is_wallet_registered"))
    return token, uid, is_new, is_wallet


# ──────────────────────────────────────────────────────────────────────────────
# Step 3 (optional): Redeem credits
# ──────────────────────────────────────────────────────────────────────────────

async def _get_available_nodeops_credits(auth_token: str, timeout: int) -> float:
    """Returns current NodeOps credit balance."""
    try:
        resp = await _get(f"{CREDITS_BASE}/credits", extra_headers=_auth_hdrs(auth_token), timeout=timeout)
        data = resp.get("data") if isinstance(resp, dict) else None
        if isinstance(data, dict):
            return float(data.get("amount") or 0)
    except Exception as exc:
        logger.warning("[register] get_credits failed: %s", exc)
    return 0.0


async def _redeem_openrouter_credits(
    auth_token: str,
    target_openrouter: float,
    timeout: int,
) -> dict:
    """POST /v1/credits/openrouter with given openrouter credits amount."""
    headers = {**_auth_hdrs(auth_token), "ReferralURL": "https://nodeops.network"}
    return await _post(
        f"{CREDITS_BASE}/credits/openrouter",
        {"credits": target_openrouter},
        extra_headers=headers,
        timeout=timeout,
    )


async def redeem_credits(
    auth_token: str,
    nodeops_credits: int = 400,
    chunk_nodeops: int = 100,
    timeout: int = 60,
) -> dict:
    """
    Redeem NodeOps platform credits → OpenRouter credits.
    Tries one-shot first; falls back to chunked (100 or 250 each call).

    Returns dict with keys:
        success, redeemed_nodeops, redeemed_openrouter, error, steps
    """
    result: dict[str, Any] = {
        "success": False,
        "redeemed_nodeops": 0,
        "redeemed_openrouter": 0.0,
        "error": "",
        "steps": [],
    }

    if chunk_nodeops not in (100, 250):
        chunk_nodeops = 100

    # Get balance
    available = await _get_available_nodeops_credits(auth_token, timeout)
    result["available_nodeops"] = available
    target = min(int(nodeops_credits), int(available))
    if target <= 0:
        result["error"] = f"Insufficient balance: available={available}, requested={nodeops_credits}"
        return result

    target_or = round(target / 100.0, 4)

    # One-shot attempt
    try:
        resp = await _redeem_openrouter_credits(auth_token, target_or, timeout)
        ok = isinstance(resp, dict) and str(resp.get("status") or "").strip().lower() == "success"
        result["steps"].append({"mode": "one_shot", "openrouter": target_or, "ok": ok, "resp": resp})
        if ok:
            result["success"] = True
            result["redeemed_nodeops"] = target
            result["redeemed_openrouter"] = target_or
            return result
        one_shot_error = str(resp.get("data") or resp.get("message") or resp)
    except Exception as exc:
        one_shot_error = str(exc)
        result["steps"].append({"mode": "one_shot", "openrouter": target_or, "ok": False, "error": one_shot_error})

    # Fallback: chunked
    logger.info("[register] one-shot redeem failed (%s), trying chunks of %d", one_shot_error, chunk_nodeops)
    redeemed_nodeops = 0
    redeemed_or = 0.0

    remaining = target
    step_idx = 1
    while remaining >= chunk_nodeops:
        chunk_or = round(chunk_nodeops / 100.0, 4)
        try:
            resp = await _redeem_openrouter_credits(auth_token, chunk_or, timeout)
            ok = isinstance(resp, dict) and str(resp.get("status") or "").strip().lower() == "success"
        except Exception as exc:
            ok = False
            resp = {"error": str(exc)}
        result["steps"].append({"mode": f"chunk_{step_idx}", "openrouter": chunk_or, "ok": ok, "resp": resp})
        if not ok:
            result["error"] = str(resp.get("data") or resp.get("message") or resp)
            break
        redeemed_nodeops += chunk_nodeops
        redeemed_or = round(redeemed_or + chunk_or, 4)
        remaining -= chunk_nodeops
        step_idx += 1

    result["redeemed_nodeops"] = redeemed_nodeops
    result["redeemed_openrouter"] = redeemed_or
    result["success"] = redeemed_nodeops >= target
    if not result["success"] and not result["error"]:
        result["error"] = f"Partial redeem: {redeemed_nodeops}/{target} NodeOps credits"
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Step 4 (optional): Bootstrap runtime
# ──────────────────────────────────────────────────────────────────────────────

async def _create_deployment_pi_agent(auth_token: str, timeout: int) -> dict:
    """
    POST /api/v1/deployments/pi-agent (latest endpoint, 2026-05-08).
    Returns dict with deployment_id, server_endpoint, project_token.
    """
    headers = {**_auth_hdrs(auth_token), "ReferralURL": "https://nodeops.network"}
    try:
        resp = await _post(f"{CONTROL_BASE}/deployments/pi-agent", {}, extra_headers=headers, timeout=timeout)
    except httpx.HTTPStatusError as exc:
        # Fallback to legacy endpoint
        logger.warning("[register] /deployments/pi-agent failed (%s), trying /deployments", exc)
        resp = await _post(
            f"{CONTROL_BASE}/deployments",
            {"prompt": "init"},
            extra_headers=headers,
            timeout=timeout,
        )

    data = resp.get("data") if isinstance(resp, dict) else {}
    if not isinstance(data, dict):
        data = {}

    deployment_id = str(data.get("id") or "").strip()
    server_endpoint = str(data.get("server_endpoint") or "").strip().rstrip("/")
    project_token = str(data.get("token") or "").strip()

    # Handle "queued" response (202 + request_id)
    if not deployment_id:
        request_id = str(data.get("request_id") or data.get("requestId") or "").strip()
        if request_id:
            return {
                "queued": True,
                "request_id": request_id,
                "status": data.get("status", ""),
                "message": data.get("message", ""),
                "raw": resp,
            }
        raise RuntimeError(f"Deployment failed, no id returned: {resp}")

    if not server_endpoint:
        raise RuntimeError(f"Deployment ok but no server_endpoint: {resp}")
    if not project_token:
        raise RuntimeError(f"Deployment ok but no token: {resp}")

    return {
        "queued": False,
        "deployment_id": deployment_id,
        "server_endpoint": server_endpoint,
        "project_token": project_token,
        "raw": resp,
    }


async def _create_session(
    server_endpoint: str,
    project_token: str,
    auth_token: str,
    timeout: int,
) -> str:
    """POST /session → returns session_id."""
    headers = {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "x-project-token": project_token,
        "y-gg-token": auth_token,
    }
    resp = await _post(f"{server_endpoint}/session", {}, extra_headers=headers, timeout=timeout)
    session_id = str(resp.get("id") or "").strip()
    if not session_id:
        raise RuntimeError(f"Create session returned no id: {resp}")
    return session_id


async def bootstrap_runtime(
    auth_token: str,
    timeout: int = 60,
) -> dict:
    """
    Create deployment + session. Returns:
        {ok, deployment_id, runtime_host, project_token, session_id, queued, error}
    """
    result: dict[str, Any] = {
        "ok": False,
        "deployment_id": "",
        "runtime_host": "",
        "project_token": "",
        "session_id": "",
        "queued": False,
        "error": "",
    }
    try:
        dep = await _create_deployment_pi_agent(auth_token, timeout)
        if dep.get("queued"):
            result["queued"] = True
            result["error"] = f"Deployment queued (request_id={dep.get('request_id')})"
            return result

        result["deployment_id"] = dep["deployment_id"]
        result["runtime_host"] = dep["server_endpoint"]
        result["project_token"] = dep["project_token"]

        session_id = await _create_session(
            dep["server_endpoint"],
            dep["project_token"],
            auth_token,
            timeout,
        )
        result["session_id"] = session_id
        result["ok"] = True
        return result

    except Exception as exc:
        result["error"] = str(exc)
        logger.error("[register] bootstrap_runtime failed: %s", exc)
        return result


# ──────────────────────────────────────────────────────────────────────────────
# Full registration flow
# ──────────────────────────────────────────────────────────────────────────────

async def register_account(
    email: str,
    otp: str,
    cfg: RegisterConfig,
    save_to_pool: bool = True,
) -> RegisterResult:
    """
    Given email + OTP (already fetched), run:
      verify → (redeem credits) → (bootstrap runtime) → save to pool.
    """
    result = RegisterResult(ok=False, email=email)

    # ── Verify OTP ─────────────────────────────────────────────────────────
    try:
        verify_resp = await verify_otp(email, otp, timeout=cfg.http_timeout_s)
    except Exception as exc:
        result.error = f"OTP verification failed: {exc}"
        logger.error("[register] %s", result.error)
        return result

    token, uid, is_new, is_wallet = _extract_token_fields(verify_resp)
    if not token:
        result.error = f"Verification succeeded but no token returned: {verify_resp}"
        logger.error("[register] %s", result.error)
        return result

    result.auth_token = token
    result.uuid_ = uid
    result.is_new_user = is_new
    result.is_wallet_registered = is_wallet
    logger.info("[register] verified %s uuid=%s is_new=%s", email, uid, is_new)

    # ── Redeem credits (optional) ──────────────────────────────────────────
    if cfg.redeem_credits and cfg.redeem_amount_nodeops > 0:
        try:
            redeem_result = await redeem_credits(
                auth_token=token,
                nodeops_credits=cfg.redeem_amount_nodeops,
                chunk_nodeops=cfg.redeem_chunk_nodeops,
                timeout=cfg.http_timeout_s,
            )
            result.credits_redeemed = float(redeem_result.get("redeemed_openrouter", 0))
            result.credits_redeem_ok = bool(redeem_result.get("success"))
            result.detail["redeem"] = redeem_result
            logger.info(
                "[register] redeem %s: success=%s redeemed_nodeops=%s",
                email,
                result.credits_redeem_ok,
                redeem_result.get("redeemed_nodeops"),
            )
        except Exception as exc:
            logger.warning("[register] redeem failed for %s: %s", email, exc)
            result.detail["redeem_error"] = str(exc)

    # ── Bootstrap runtime (optional) ──────────────────────────────────────
    if cfg.create_runtime:
        rt = await bootstrap_runtime(auth_token=token, timeout=cfg.http_timeout_s)
        result.deployment_id = rt.get("deployment_id", "")
        result.runtime_host = rt.get("runtime_host", "")
        result.project_token = rt.get("project_token", "")
        result.session_id = rt.get("session_id", "")
        result.runtime_ready = rt.get("ok", False)
        result.detail["runtime"] = rt
        if not rt["ok"]:
            logger.warning("[register] runtime bootstrap failed for %s: %s", email, rt.get("error"))

    # ── Save to account pool ───────────────────────────────────────────────
    if save_to_pool:
        try:
            # Upsert: update if exists, add if not
            existing = account_pool.get_account_by_email(email)
            if existing:
                updates: dict[str, Any] = {"auth_token": token}
                if result.deployment_id:
                    updates["deployment_id"] = result.deployment_id
                if result.runtime_host:
                    updates["runtime_host"] = result.runtime_host
                if result.project_token:
                    updates["project_token"] = result.project_token
                if result.session_id:
                    updates["session_id"] = result.session_id
                updates["status"] = "available"
                account_pool.update_account(existing["id"], updates)
                result.account_id = existing["id"]
            else:
                acc = account_pool.add_account(
                    email=email,
                    auth_token=token,
                    deployment_id=result.deployment_id,
                    runtime_host=result.runtime_host,
                    project_token=result.project_token,
                )
                result.account_id = acc["id"]
                # store session_id too if present
                if result.session_id:
                    account_pool.update_account(acc["id"], {"session_id": result.session_id})
            logger.info("[register] saved account %s id=%s", email, result.account_id)
        except Exception as exc:
            logger.error("[register] save to pool failed for %s: %s", email, exc)
            result.detail["pool_error"] = str(exc)

    result.ok = True
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Gmail auto-register: send OTP, poll Gmail, verify
# ──────────────────────────────────────────────────────────────────────────────

async def gmail_auto_register(
    target_email: str,
    gmail_cfg: GmailConfig,
    reg_cfg: RegisterConfig,
    save_to_pool: bool = True,
) -> RegisterResult:
    """
    Full automatic registration flow using Gmail IMAP:
      1. Send OTP to `target_email`
      2. Poll Gmail inbox for the OTP code
      3. Verify + optional redeem + optional runtime bootstrap
      4. Save to account pool

    `target_email` can be a Gmail alias like feijidfg55+alias01@gmail.com
    so the OTP is delivered to the main Gmail inbox.
    """
    result = RegisterResult(ok=False, email=target_email)

    # Step 1: send OTP
    try:
        send_resp = await send_otp(target_email, timeout=30)
        result.detail["send_otp"] = send_resp
        logger.info("[register] OTP sent to %s", target_email)
    except Exception as exc:
        result.error = f"Failed to send OTP to {target_email}: {exc}"
        logger.error("[register] %s", result.error)
        return result

    # Step 2: poll Gmail for code
    inbox = GmailIMAPInbox(
        email_addr=gmail_cfg.email,
        app_password=gmail_cfg.app_password,
        imap_host=gmail_cfg.imap_host,
        imap_port=gmail_cfg.imap_port,
        proxy_type=gmail_cfg.proxy_type,
        proxy_host=gmail_cfg.proxy_host,
        proxy_port=gmail_cfg.proxy_port,
        lookback_hours=gmail_cfg.lookback_hours,
        max_mails=gmail_cfg.max_mails,
    )

    # Use the target email as filter so we pick the right alias's email
    to_filter = target_email if "+" in target_email else ""

    fetch_result = await inbox.wait_for_code(
        to_email_contains=to_filter,
        delete_best=gmail_cfg.delete_best,
        poll_interval_s=gmail_cfg.poll_interval_s,
        timeout_s=gmail_cfg.otp_timeout_s,
    )
    result.detail["gmail_fetch"] = fetch_result.to_dict()

    if not fetch_result.ok or not fetch_result.best_code:
        result.error = f"Could not fetch OTP from Gmail: {fetch_result.error}"
        logger.error("[register] %s", result.error)
        return result

    otp = fetch_result.best_code
    logger.info("[register] Got OTP for %s: %s", target_email, otp)

    # Steps 3-5
    reg = await register_account(
        email=target_email,
        otp=otp,
        cfg=reg_cfg,
        save_to_pool=save_to_pool,
    )
    reg.detail.update(result.detail)
    return reg


# ──────────────────────────────────────────────────────────────────────────────
# Batch registration
# ──────────────────────────────────────────────────────────────────────────────

async def batch_gmail_register(
    emails: list[str],
    gmail_cfg: GmailConfig,
    reg_cfg: RegisterConfig,
    concurrency: int = 3,
    save_to_pool: bool = True,
) -> list[RegisterResult]:
    """
    Register multiple accounts concurrently with a semaphore to throttle.

    Each email in `emails` goes through gmail_auto_register independently.
    Use Gmail plus-addressing (user+tag@gmail.com) so each alias maps to
    a unique NodeOps account but all OTPs land in the same inbox.
    """
    sem = asyncio.Semaphore(concurrency)

    async def _one(email: str) -> RegisterResult:
        async with sem:
            return await gmail_auto_register(
                target_email=email,
                gmail_cfg=gmail_cfg,
                reg_cfg=reg_cfg,
                save_to_pool=save_to_pool,
            )

    tasks = [asyncio.create_task(_one(e)) for e in emails]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    final: list[RegisterResult] = []
    for email, r in zip(emails, results):
        if isinstance(r, Exception):
            final.append(RegisterResult(ok=False, email=email, error=str(r)))
        else:
            final.append(r)
    return final


def generate_gmail_aliases(base_email: str, count: int, prefix: str = "no") -> list[str]:
    """
    Generate Gmail plus-address aliases:
      feijidfg55+no001@gmail.com, feijidfg55+no002@gmail.com, ...

    All delivered to the same Gmail inbox so one GmailIMAPInbox handles all.
    """
    local, domain = base_email.split("@", 1)
    return [f"{local}+{prefix}{i:03d}@{domain}" for i in range(1, count + 1)]
