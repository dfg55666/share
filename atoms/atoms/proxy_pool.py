#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ProxyEndpoint:
    host: str
    port: int
    username: str
    password: str

    @property
    def label(self) -> str:
        return f"{self.host}:{self.port}"

    @property
    def url(self) -> str:
        return f"http://{self.username}:{self.password}@{self.host}:{self.port}"


# Verified on 2026-05-07 with HTTP 200 via https://api.ipify.org?format=json
WORKING_PROXY_ENDPOINTS: tuple[ProxyEndpoint, ...] = (
    ProxyEndpoint("31.59.20.176", 6754, "ucgelnyy", "jh3gso8vifly"),
    ProxyEndpoint("198.23.239.134", 6540, "ucgelnyy", "jh3gso8vifly"),
    ProxyEndpoint("45.38.107.97", 6014, "ucgelnyy", "jh3gso8vifly"),
    ProxyEndpoint("107.172.163.27", 6543, "ucgelnyy", "jh3gso8vifly"),
    ProxyEndpoint("216.10.27.159", 6837, "ucgelnyy", "jh3gso8vifly"),
    ProxyEndpoint("142.111.67.146", 5611, "ucgelnyy", "jh3gso8vifly"),
)


import threading
import time

class RotatingProxyPool:
    def __init__(self, urls: list[str], bad_cooldown_s: float = 120.0):
        self.urls = list(urls)
        self.lock = threading.Lock()
        self.index = 0
        self.bad_proxies: set[str] = set()
        self.bad_until: dict[str, float] = {}
        self.bad_cooldown_s = max(1.0, float(bad_cooldown_s))

    def get_proxy(self) -> str:
        with self.lock:
            if not self.urls:
                return ""
            now = time.time()
            # Expire cooled-down proxies.
            expired = [u for u, until in self.bad_until.items() if now >= float(until)]
            for u in expired:
                self.bad_until.pop(u, None)
                self.bad_proxies.discard(u)

            # Filter out currently banned ones if possible.
            available = [u for u in self.urls if u not in self.bad_proxies]
            if not available:
                # Reset bad proxies if all are marked bad
                self.bad_proxies.clear()
                self.bad_until.clear()
                available = self.urls
            
            proxy = available[self.index % len(available)]
            self.index = (self.index + 1) % len(available)
            return proxy

    def mark_bad(self, url: str):
        with self.lock:
            if url in self.urls:
                self.bad_proxies.add(url)
                self.bad_until[url] = time.time() + self.bad_cooldown_s

def working_proxy_urls() -> list[str]:
    return [ep.url for ep in WORKING_PROXY_ENDPOINTS]


def select_proxy_url_for_worker(worker_id: int, urls: Sequence[str] | None = None) -> str:
    pool = list(urls) if urls is not None else working_proxy_urls()
    if not pool:
        return ""
    idx = (max(1, int(worker_id)) - 1) % len(pool)
    return str(pool[idx])


def mask_proxy_url(proxy_url: str) -> str:
    raw = str(proxy_url or "").strip()
    if "@" not in raw or "://" not in raw:
        return raw
    scheme, rest = raw.split("://", 1)
    creds, host = rest.rsplit("@", 1)
    if ":" in creds:
        user, _ = creds.split(":", 1)
        masked = f"{user}:***"
    else:
        masked = "***"
    return f"{scheme}://{masked}@{host}"
