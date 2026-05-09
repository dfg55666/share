#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
FETCH_SCRIPT = SCRIPT_DIR / "fetch_verification_code.py"


def env_or(payload, key, env_key, default=None):
    value = payload.get(key)
    if value is None or value == "":
        value = os.environ.get(env_key, default)
    return value


def build_fetch_command(payload):
    email = env_or(payload, "email", "NODEOPS_GMAIL", "feijidfg55@gmail.com")
    app_password = env_or(payload, "app_password", "NODEOPS_GMAIL_APP_PASSWORD", "")
    host = env_or(payload, "host", "NODEOPS_IMAP_HOST", "imap.gmail.com")
    proxy_type = env_or(payload, "proxy_type", "NODEOPS_PROXY_TYPE", "http")
    proxy_host = env_or(payload, "proxy_host", "NODEOPS_PROXY_HOST", "127.0.0.1")
    proxy_port = env_or(payload, "proxy_port", "NODEOPS_PROXY_PORT", "7897")
    lookback_hours = str(env_or(payload, "lookback_hours", "NODEOPS_LOOKBACK_HOURS", "72"))
    max_mails = str(env_or(payload, "max_mails", "NODEOPS_MAX_MAILS", "120"))
    to_email_contains = env_or(payload, "to_email_contains", "NODEOPS_TO_EMAIL_CONTAINS", "")
    delete_best = env_or(payload, "delete_best", "NODEOPS_DELETE_BEST", "1")

    if not app_password:
        raise RuntimeError("Missing app password (NODEOPS_GMAIL_APP_PASSWORD).")

    cmd = [
        sys.executable,
        str(FETCH_SCRIPT),
        "--email",
        str(email),
        "--app-password",
        str(app_password),
        "--host",
        str(host),
        "--lookback-hours",
        lookback_hours,
        "--max-mails",
        max_mails,
        "--json",
    ]

    if proxy_host and proxy_port:
        cmd.extend(
            [
                "--proxy-type",
                str(proxy_type or "http"),
                "--proxy-host",
                str(proxy_host),
                "--proxy-port",
                str(proxy_port),
            ]
        )

    if to_email_contains:
        cmd.extend(["--to-email-contains", str(to_email_contains)])

    if str(delete_best).lower() not in ("0", "false", "no", "off"):
        cmd.append("--delete-best")

    return cmd


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        if self.path != "/health":
            self._send_json(404, {"ok": False, "error": "Not found"})
            return
        self._send_json(200, {"ok": True, "service": "otp-bridge"})

    def do_POST(self):
        if self.path != "/otp/latest":
            self._send_json(404, {"ok": False, "error": "Not found"})
            return

        try:
            content_len = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_len) if content_len > 0 else b"{}"
            payload = json.loads(raw.decode("utf-8") or "{}")
            if not isinstance(payload, dict):
                payload = {}
        except Exception as exc:
            self._send_json(400, {"ok": False, "error": f"Bad JSON payload: {exc}"})
            return

        try:
            cmd = build_fetch_command(payload)
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        except Exception as exc:
            self._send_json(500, {"ok": False, "error": f"Bridge execution error: {exc}"})
            return

        stdout = (proc.stdout or "").strip()
        stderr = (proc.stderr or "").strip()
        if proc.returncode != 0:
            self._send_json(
                500,
                {
                    "ok": False,
                    "error": "fetch_verification_code failed",
                    "return_code": proc.returncode,
                    "stdout": stdout[-1000:],
                    "stderr": stderr[-1000:],
                },
            )
            return

        try:
            data = json.loads(stdout)
        except Exception as exc:
            self._send_json(
                500,
                {
                    "ok": False,
                    "error": f"Invalid JSON output: {exc}",
                    "stdout": stdout[-1000:],
                },
            )
            return

        self._send_json(
            200,
            {
                "ok": True,
                "code": data.get("best_code", ""),
                "to": data.get("to", ""),
                "from": data.get("from", ""),
                "subject": data.get("subject", ""),
                "date": data.get("date", ""),
                "deleted": bool(data.get("deleted")),
            },
        )


def main():
    parser = argparse.ArgumentParser(description="Local HTTP bridge for OTP fetcher")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=17897)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"[OTP-BRIDGE] listening on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
