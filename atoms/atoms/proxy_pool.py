#!/usr/bin/env python3
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Dict, Optional, Sequence


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
    ProxyEndpoint("31.59.20.176", 6754, "aykopfqs", "j831l1r6bi1y"),
    ProxyEndpoint("198.23.239.134", 6540, "aykopfqs", "j831l1r6bi1y"),
    ProxyEndpoint("45.38.107.97", 6014, "aykopfqs", "j831l1r6bi1y"),
    ProxyEndpoint("107.172.163.27", 6543, "aykopfqs", "j831l1r6bi1y"),
    ProxyEndpoint("216.10.27.159", 6837, "aykopfqs", "j831l1r6bi1y"),
    ProxyEndpoint("142.111.67.146", 5611, "aykopfqs", "j831l1r6bi1y"),
)


@dataclass
class _ProxyStats:
    """Per-proxy health tracking."""
    success_count: int = 0
    fail_count: int = 0
    consecutive_fails: int = 0
    last_fail_time: float = 0.0
    last_success_time: float = 0.0
    cooldown_until: float = 0.0
    # Rate-limit (4429) specific tracking
    rate_limit_count: int = 0
    last_rate_limit_time: float = 0.0


class RotatingProxyPool:
    """
    Thread-safe rotating proxy pool with smart health management.

    Features over the old implementation:
    - Per-proxy success/fail/rate-limit statistics
    - Exponential backoff cooldowns (longer ban for repeated failures)
    - Separate rate-limit (4429) cooldown that's longer than generic failures
    - Least-recently-used + best-health scoring for proxy selection
    - Automatic cooldown reset when all proxies are banned
    """

    def __init__(
        self,
        urls: list[str],
        bad_cooldown_s: float = 60.0,
        rate_limit_cooldown_s: float = 120.0,
        max_cooldown_s: float = 600.0,
    ):
        self.urls = list(urls)
        self.lock = threading.Lock()
        self.index = 0
        self.bad_cooldown_s = max(1.0, float(bad_cooldown_s))
        self.rate_limit_cooldown_s = max(1.0, float(rate_limit_cooldown_s))
        self.max_cooldown_s = max(self.rate_limit_cooldown_s, float(max_cooldown_s))
        self._stats: Dict[str, _ProxyStats] = {u: _ProxyStats() for u in self.urls}

    def _get_stats(self, url: str) -> _ProxyStats:
        if url not in self._stats:
            self._stats[url] = _ProxyStats()
        return self._stats[url]

    def get_proxy(self) -> str:
        """Get the best available proxy, preferring healthy ones."""
        with self.lock:
            if not self.urls:
                return ""
            now = time.time()

            # Separate available (not in cooldown) from cooling-down
            available: list[tuple[str, float]] = []  # (url, score)
            for u in self.urls:
                stats = self._get_stats(u)
                if now < stats.cooldown_until:
                    continue
                # Score: lower is better.
                # Prefer: fewer consecutive fails, more successes, less recent rate limits
                score = (
                    stats.consecutive_fails * 100.0
                    + stats.rate_limit_count * 10.0
                    - stats.success_count * 0.1
                )
                available.append((u, score))

            if not available:
                # All proxies in cooldown — reset all cooldowns and pick round-robin
                for u in self.urls:
                    s = self._get_stats(u)
                    s.cooldown_until = 0.0
                    s.consecutive_fails = 0
                proxy = self.urls[self.index % len(self.urls)]
                self.index = (self.index + 1) % len(self.urls)
                return proxy

            # Sort by score (best first), then round-robin within same-score tier
            available.sort(key=lambda x: x[1])

            # Pick from available using round-robin index scoped to available list size
            idx = self.index % len(available)
            self.index += 1
            return available[idx][0]

    def mark_success(self, url: str) -> None:
        """Record a successful request through this proxy."""
        with self.lock:
            stats = self._get_stats(url)
            stats.success_count += 1
            stats.consecutive_fails = 0
            stats.last_success_time = time.time()
            # Successful request resets cooldown
            stats.cooldown_until = 0.0

    def mark_bad(self, url: str) -> None:
        """Record a generic failure (connection error, timeout, etc.)."""
        with self.lock:
            stats = self._get_stats(url)
            stats.fail_count += 1
            stats.consecutive_fails += 1
            stats.last_fail_time = time.time()
            # Exponential backoff: 60s, 120s, 240s, ... capped at max_cooldown_s
            backoff = self.bad_cooldown_s * (2.0 ** min(stats.consecutive_fails - 1, 6))
            stats.cooldown_until = time.time() + min(backoff, self.max_cooldown_s)

    def mark_rate_limited(self, url: str) -> None:
        """
        Record a rate-limit (4429) response. Uses a longer cooldown than generic failures
        because rate limits indicate the server is tracking this IP specifically.
        """
        with self.lock:
            stats = self._get_stats(url)
            stats.fail_count += 1
            stats.consecutive_fails += 1
            stats.rate_limit_count += 1
            stats.last_rate_limit_time = time.time()
            stats.last_fail_time = time.time()
            # Rate-limit backoff is more aggressive: 120s, 240s, 480s, ...
            backoff = self.rate_limit_cooldown_s * (2.0 ** min(stats.rate_limit_count - 1, 5))
            stats.cooldown_until = time.time() + min(backoff, self.max_cooldown_s)

    def get_status_summary(self) -> str:
        """Return a human-readable summary of all proxy states (for logging)."""
        with self.lock:
            now = time.time()
            parts = []
            for u in self.urls:
                stats = self._get_stats(u)
                host_port = u.rsplit("@", 1)[-1] if "@" in u else u
                cd_left = max(0.0, stats.cooldown_until - now)
                status = "OK" if cd_left == 0 else f"CD:{cd_left:.0f}s"
                parts.append(
                    f"{host_port}[{status} ok={stats.success_count} "
                    f"fail={stats.fail_count} rl={stats.rate_limit_count}]"
                )
            return " | ".join(parts)

    def available_count(self) -> int:
        """Number of proxies not currently in cooldown."""
        with self.lock:
            now = time.time()
            return sum(1 for u in self.urls if now >= self._get_stats(u).cooldown_until)


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
