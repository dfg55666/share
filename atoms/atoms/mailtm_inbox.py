"""
mail.tm inbox helper (stdlib-only).

This module is intentionally self-contained so it can be copied into other scripts/projects.

Example:

    from auth.mailtm_inbox import MailTMInbox

    inbox = MailTMInbox(logger=print)
    email = inbox.generate_email()
    print("email:", email)
    token = inbox.wait_for_verification_token(timeout_s=180, debug=True)
    print("token:", token)
"""

from __future__ import annotations

import html as _html
import json
import random
import re
import time
import urllib.error
import urllib.request
from urllib.parse import parse_qs, urlparse
from typing import Any, Callable, Dict, List, Optional, Tuple


_DEFAULT_TIMEOUT_S = 30
_API_BASE = "https://api.mail.tm"
_DEFAULT_MAILTM_PASSWORD = "@#Dfg55666"
_HUMAN_NAME_PREFIXES = (
    "liam",
    "noah",
    "oliver",
    "emma",
    "sophia",
    "ava",
    "mia",
    "lucas",
    "jack",
    "ryan",
    "zoe",
    "nora",
    "chris",
    "alex",
    "ella",
    "ivy",
    "leo",
    "luna",
    "mason",
    "ethan",
)


_ATOMS_VERIFY_LINK_PATTERNS = [
    # Plain text URL and HTML href URL both match this.
    re.compile(r"https://atoms\.dev/verify-email\?[^\s<>\]\"')]+", re.IGNORECASE),
]

_ATOMS_VERIFY_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{20,256}$")

# Kept for backward compatibility with old code-based providers,
# but intentionally without broad generic fallback patterns.
_CODE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"Your verification code is[:\s]+(\d{6})",
        r"verification code[:\s]+(?:is[:\s]+)?(\d{6})",
        r"verify(?:ing)? code[:\s]+(?:is[:\s]+)?(\d{6})",
        r"otp[:\s]+(\d{6})",
        r"code[:\s]+(\d{6})",
        r"<strong>(\d{6})</strong>",
        r"<span[^>]*>(\d{6})</span>",
    ]
]


def _generate_random_string(length: int) -> str:
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(random.choice(chars) for _ in range(length))


def _generate_human_like_username() -> str:
    prefix = random.choice(_HUMAN_NAME_PREFIXES)
    suffix = random.randint(10000, 99999)
    return f"{prefix}{suffix}"


def extract_verification_code(content: str) -> str:
    """
    Extract a 6-digit code from text or HTML.

    It tries patterns first, then various fallbacks to support segmented HTML digits.
    """

    if not content:
        return ""

    candidates = [content]

    # Strip HTML tags to make codes like "<span>1</span>...<span>6</span>" parseable.
    try:
        stripped = re.sub(r"<[^>]+>", " ", content)
        stripped = _html.unescape(stripped)
        if stripped and stripped != content:
            candidates.append(stripped)
    except Exception:
        pass

    for candidate in candidates:
        for regex in _CODE_PATTERNS:
            match = regex.search(candidate)
            if match:
                return match.group(1)

    return ""


def extract_verification_link(content: str) -> str:
    """
    Extract Atoms verification link from text or HTML.

    Current Atoms email format (observed 2026-05-05):
    - subject: "Verify your email for Atoms"
    - URL path: https://atoms.dev/verify-email?token=...&email=...&redirect=...
    """
    if not content:
        return ""

    candidate = _html.unescape(content)
    for regex in _ATOMS_VERIFY_LINK_PATTERNS:
        match = regex.search(candidate)
        if not match:
            continue
        url = match.group(0).strip().rstrip(".,;)")
        return url
    return ""


def extract_verification_token(content: str) -> str:
    """
    Extract verification token from Atoms verification link.
    """
    link = extract_verification_link(content)
    if not link:
        return ""
    try:
        parsed = urlparse(link)
        if parsed.scheme != "https" or parsed.netloc.lower() != "atoms.dev" or parsed.path != "/verify-email":
            return ""
        token = parse_qs(parsed.query).get("token", [""])[0].strip()
        if token and _ATOMS_VERIFY_TOKEN_RE.fullmatch(token):
            return token
    except Exception:
        return ""
    return ""


class MailTMInbox:
    """
    Minimal mail.tm wrapper to:
    - create a disposable inbox (account)
    - poll for messages
    - extract Atoms verification token from verification link
    """

    def __init__(
        self,
        password: Optional[str] = None,
        logger: Optional[Callable[[str], None]] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        self.password = password or _DEFAULT_MAILTM_PASSWORD
        self.email = ""
        self.token = ""
        self._logger = logger
        self._user_agent = user_agent or "mailtm-inbox/1.0"

    def _log(self, msg: str) -> None:
        if self._logger is None:
            return
        try:
            self._logger(msg)
        except Exception:
            pass

    def _request_json(
        self,
        method: str,
        url: str,
        body: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout_s: float = _DEFAULT_TIMEOUT_S,
    ) -> Tuple[int, Any, str]:
        payload = None
        req_headers: Dict[str, str] = {
            "Accept": "application/json",
            "User-Agent": self._user_agent,
        }
        if headers:
            req_headers.update(headers)
        if body is not None:
            payload = json.dumps(body).encode("utf-8")
            req_headers.setdefault("Content-Type", "application/json")

        request = urllib.request.Request(url, data=payload, method=method, headers=req_headers)
        try:
            with urllib.request.urlopen(request, timeout=timeout_s) as response:
                status = response.getcode()
                text = response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            status = error.code
            text = error.read().decode("utf-8", errors="replace")

        try:
            parsed = json.loads(text) if text else {}
        except json.JSONDecodeError:
            parsed = text

        return status, parsed, text

    def _login(self) -> None:
        if not self.email:
            raise RuntimeError("mail.tm login: email missing")

        status, payload, raw = self._request_json(
            "POST",
            f"{_API_BASE}/token",
            body={"address": self.email, "password": self.password},
        )
        if status != 200 or not isinstance(payload, dict) or not payload.get("token"):
            raise RuntimeError(f"mail.tm login failed ({status}): {raw}")
        self.token = str(payload.get("token"))

    def _list_domains(self) -> List[str]:
        status, payload, raw = self._request_json("GET", f"{_API_BASE}/domains")
        if status == 429:
            raise RuntimeError("mail.tm rate limited (429)")
        if status != 200:
            raise RuntimeError(f"mail.tm domains failed ({status}): {raw}")

        members: List[Dict[str, Any]] = []
        if isinstance(payload, list):
            members = [item for item in payload if isinstance(item, dict)]
        elif isinstance(payload, dict):
            value = payload.get("hydra:member")
            if isinstance(value, list):
                members = [item for item in value if isinstance(item, dict)]
            elif isinstance(payload.get("domains"), list):
                members = [item for item in payload.get("domains", []) if isinstance(item, dict)]

        domains: List[str] = []
        for item in members:
            domain = str(item.get("domain", "")).strip()
            if domain:
                domains.append(domain)

        if not domains:
            raw_preview = str(raw)[:240].replace("\n", " ")
            raise RuntimeError(f"mail.tm has no domain, payload={raw_preview}")

        return domains

    def _create_inbox_once(self) -> str:
        domains = self._list_domains()
        domain = str(domains[0]).strip()
        if not domain:
            raise RuntimeError("mail.tm domain missing")

        username = _generate_human_like_username()
        email = f"{username}@{domain}"
        status, _, raw = self._request_json(
            "POST",
            f"{_API_BASE}/accounts",
            body={"address": email, "password": self.password},
        )
        if status == 429:
            raise RuntimeError("mail.tm rate limited (429)")
        if status != 201:
            raise RuntimeError(f"mail.tm create account failed ({status}): {raw}")

        self.email = email
        self._login()
        return email

    def generate_email(self, max_retries: int = 5) -> str:
        for retry in range(max_retries):
            if retry > 0:
                wait_s = 3 + retry * 3
                self._log(f"mail.tm retry #{retry}, wait {wait_s}s")
                time.sleep(wait_s)
            try:
                return self._create_inbox_once()
            except Exception as exc:
                # Best-effort retry behavior: back off on rate limiting.
                if "429" in str(exc) and retry + 1 < max_retries:
                    continue
                raise
        raise RuntimeError("mail.tm retries exhausted")

    def wait_for_verification_code(self, timeout_s: float, debug: bool = False) -> str:
        """
        Backward-compatible alias: returns verification token (not 6-digit code).
        """
        return self.wait_for_verification_token(timeout_s=timeout_s, debug=debug)

    def wait_for_verification_link(self, timeout_s: float, debug: bool = False) -> str:
        if not self.token:
            raise RuntimeError("mail.tm token missing")

        deadline = time.monotonic() + float(timeout_s)
        seen_ids: set[str] = set()
        last_preview = ""

        while time.monotonic() < deadline:
            status, payload, _ = self._request_json(
                "GET",
                f"{_API_BASE}/messages",
                headers={"Authorization": f"Bearer {self.token}"},
            )
            if status != 200:
                time.sleep(3)
                continue

            members: List[Dict[str, Any]] = []
            if isinstance(payload, list):
                members = [item for item in payload if isinstance(item, dict)]
            elif isinstance(payload, dict):
                value = payload.get("hydra:member")
                if isinstance(value, list):
                    members = [item for item in value if isinstance(item, dict)]
                elif isinstance(payload.get("messages"), list):
                    members = [item for item in payload.get("messages", []) if isinstance(item, dict)]

            if debug:
                subjects = []
                for msg in members[:5]:
                    subj = str(msg.get("subject") or "")
                    if subj:
                        subjects.append(subj[:80])
                self._log(f"mail.tm inbox poll: messages={len(members)}, subjects={subjects}")

            for msg in members:
                msg_id = str(msg.get("id", "")).strip()
                if not msg_id or msg_id in seen_ids:
                    continue
                seen_ids.add(msg_id)

                status, detail, _ = self._request_json(
                    "GET",
                    f"{_API_BASE}/messages/{msg_id}",
                    headers={"Authorization": f"Bearer {self.token}"},
                )
                if status != 200 or not isinstance(detail, dict):
                    continue

                subject = str(detail.get("subject") or "")
                text = str(detail.get("text") or "")
                html_list = detail.get("html")

                chunks: List[str] = [subject, text]
                if isinstance(html_list, list):
                    chunks.extend(str(html) for html in html_list)

                combined = "\n".join(chunks)
                link = extract_verification_link(combined)
                if link:
                    return link

                if debug:
                    preview = re.sub(r"\s+", " ", combined).strip()
                    last_preview = preview[:360]
                    self._log(f"mail.tm message {msg_id} parsed no link; preview={last_preview!r}")

            time.sleep(3)

        suffix = f"; last_preview={last_preview!r}" if last_preview else ""
        raise RuntimeError("mail.tm wait for verification link timeout" + suffix)

    def wait_for_verification_token(self, timeout_s: float, debug: bool = False) -> str:
        link = self.wait_for_verification_link(timeout_s=timeout_s, debug=debug)
        token = extract_verification_token(link)
        if not token:
            raise RuntimeError(f"mail.tm verification link has no valid token: {link}")
        return token
