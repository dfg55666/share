#!/usr/bin/env python3
import argparse
import email
import html
import imaplib
import json
import re
import socket
import sys
from datetime import datetime, timedelta, timezone
from email.header import decode_header, make_header
from email.message import Message
from email.utils import parsedate_to_datetime

try:
    import socks
except Exception:  # pragma: no cover
    socks = None


KEYWORDS = (
    "nodeops",
    "createos",
    "verification",
    "verify",
    "one-time",
    "otp",
    "code",
    "login",
    "signin",
    "sign in",
    "验证码",
)


def decode_mime(value: str) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def extract_text_from_message(msg: Message) -> str:
    chunks = []
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type not in ("text/plain", "text/html"):
                continue
            payload = part.get_payload(decode=True) or b""
            charset = part.get_content_charset() or "utf-8"
            try:
                text = payload.decode(charset, errors="ignore")
            except Exception:
                text = payload.decode("utf-8", errors="ignore")
            if content_type == "text/html":
                text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=re.I)
                text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
                text = re.sub(r"<[^>]+>", " ", text)
                text = html.unescape(text)
            chunks.append(text)
    else:
        payload = msg.get_payload(decode=True) or b""
        charset = msg.get_content_charset() or "utf-8"
        try:
            chunks.append(payload.decode(charset, errors="ignore"))
        except Exception:
            chunks.append(payload.decode("utf-8", errors="ignore"))
    return "\n".join(chunks)


def score_message(subject: str, sender: str, body: str) -> int:
    text = f"{subject}\n{sender}\n{body}".lower()
    score = 0
    for keyword in KEYWORDS:
        if keyword in text:
            score += 1
    if re.search(r"\b\d{4,8}\b", text):
        score += 2
    return score


def find_codes(text: str):
    # Common verification lengths: 4-8 digits
    return re.findall(r"\b(\d{4,8})\b", text)


def message_time(msg) -> datetime:
    dt_raw = msg.get("Date", "")
    try:
        dt = parsedate_to_datetime(dt_raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def apply_proxy(proxy_type: str, proxy_host: str, proxy_port: int):
    if not proxy_host or not proxy_port:
        return None
    if socks is None:
        raise RuntimeError("PySocks not installed, cannot use proxy.")

    proxy_type_map = {
        "socks5": socks.SOCKS5,
        "socks4": socks.SOCKS4,
        "http": socks.HTTP,
    }
    if proxy_type not in proxy_type_map:
        raise RuntimeError(f"Unsupported proxy type: {proxy_type}")

    original_socket = socket.socket
    socks.set_default_proxy(proxy_type_map[proxy_type], proxy_host, proxy_port, rdns=True)
    socket.socket = socks.socksocket
    return original_socket


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch latest verification code from Gmail via IMAP.")
    parser.add_argument("--email", required=True, help="Gmail address")
    parser.add_argument("--app-password", required=True, help="Gmail app password")
    parser.add_argument("--host", default="imap.gmail.com", help="Primary IMAP host")
    parser.add_argument("--port", type=int, default=993, help="IMAP SSL port")
    parser.add_argument("--max-mails", type=int, default=80, help="How many recent mails to inspect")
    parser.add_argument("--lookback-hours", type=int, default=48, help="Only consider recent hours")
    parser.add_argument("--proxy-type", choices=["http", "socks5", "socks4"], default=None, help="Proxy type")
    parser.add_argument("--proxy-host", default=None, help="Proxy host, e.g. 127.0.0.1")
    parser.add_argument("--proxy-port", type=int, default=None, help="Proxy port, e.g. 7897")
    parser.add_argument("--to-email-contains", default=None, help="Filter by recipient email substring")
    parser.add_argument("--delete-best", action="store_true", help="Delete best-matched email after reading code")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")
    args = parser.parse_args()

    app_password = args.app_password.replace(" ", "")
    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.lookback_hours)

    original_socket = None
    if args.proxy_host and args.proxy_port:
        try:
            original_socket = apply_proxy(args.proxy_type or "http", args.proxy_host, args.proxy_port)
        except Exception as exc:
            print(f"[ERROR] Proxy setup failed: {exc}")
            return 5

    hosts_to_try = [args.host]
    if args.host.lower() == "imap.gmail.com":
        hosts_to_try.append("imap.googlemail.com")

    imap = None
    last_error = None
    try:
        for host in hosts_to_try:
            try:
                imap = imaplib.IMAP4_SSL(host, args.port)
                imap.login(args.email, app_password)
                imap.select("INBOX")
                break
            except Exception as exc:
                last_error = exc
                imap = None
        if imap is None:
            print(f"[ERROR] IMAP login/select failed: {last_error}")
            return 2
    finally:
        if original_socket is not None:
            socket.socket = original_socket

    typ, data = imap.search(None, "ALL")
    if typ != "OK" or not data or not data[0]:
        print("[ERROR] No messages found in inbox.")
        return 3

    ids = data[0].split()
    ids = ids[-args.max_mails:]
    ids.reverse()

    candidates = []
    for msg_id in ids:
        typ, fetched = imap.fetch(msg_id, "(RFC822)")
        if typ != "OK" or not fetched or not fetched[0]:
            continue
        raw = fetched[0][1]
        msg = email.message_from_bytes(raw)

        subject = decode_mime(msg.get("Subject", ""))
        sender = decode_mime(msg.get("From", ""))
        to_addr = decode_mime(msg.get("To", ""))
        if args.to_email_contains and args.to_email_contains.lower() not in to_addr.lower():
            continue
        dt = message_time(msg)
        if dt < cutoff:
            continue

        body = extract_text_from_message(msg)
        seen = set()
        codes = []
        for code in find_codes(f"{subject}\n{body}"):
            if code not in seen:
                seen.add(code)
                codes.append(code)
        score = score_message(subject, sender, body)
        if score <= 0 or not codes:
            continue

        candidates.append(
            {
                "msg_id": msg_id.decode() if isinstance(msg_id, (bytes, bytearray)) else str(msg_id),
                "score": score,
                "date": dt,
                "subject": subject.strip(),
                "from": sender.strip(),
                "to": to_addr.strip(),
                "codes": codes,
            }
        )

    if not candidates:
        imap.logout()
        print("[WARN] No likely verification email with code found.")
        return 4

    candidates.sort(key=lambda x: (x["score"], x["date"]), reverse=True)
    best = candidates[0]
    deleted = False

    if args.delete_best:
        try:
            imap.store(best["msg_id"], "+FLAGS", "\\Deleted")
            imap.expunge()
            deleted = True
        except Exception:
            deleted = False

    imap.logout()

    payload = {
        "ok": True,
        "date": best["date"].isoformat(),
        "from": best["from"],
        "to": best["to"],
        "subject": best["subject"],
        "codes": best["codes"],
        "best_code": best["codes"][0],
        "deleted": deleted,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    print("[OK] Best matched verification email:")
    print(f"Date   : {best['date'].isoformat()}")
    print(f"From   : {best['from']}")
    print(f"To     : {best['to']}")
    print(f"Subject: {best['subject']}")
    print(f"Codes  : {', '.join(best['codes'])}")
    print(f"BestCode: {best['codes'][0]}")
    print(f"Deleted: {'yes' if deleted else 'no'}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
