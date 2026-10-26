"""Groq API Key Rotator."""

import time
from dataclasses import dataclass, field


@dataclass
class KeyStats:
    """Track usage and errors for a single API key."""

    total_requests: int = 0
    total_errors: int = 0
    last_error_time: float = 0.0
    is_rate_limited: bool = False
    rate_limit_reset: float = 0.0


class KeyRotator:
    """Rotate multiple Groq API keys to maximize throughput.

    Strategy:
    - Round-robin across healthy keys
    - Skip rate-limited keys until reset
    - Track per-key stats for monitoring
    """

    def __init__(self, keys: list[str]):
        if not keys:
            raise ValueError("At least one Groq API key is required")
        self._keys = keys
        self._index = 0
        self._stats: dict[str, KeyStats] = {k: KeyStats() for k in keys}

    @property
    def total_keys(self) -> int:
        return len(self._keys)

    def get_key(self) -> str:
        """Get next available API key (skip rate-limited ones)."""
        now = time.time()
        attempts = 0

        while attempts < self.total_keys:
            key = self._keys[self._index % self.total_keys]
            self._index += 1
            stats = self._stats[key]

            # Reset rate limit if cooldown passed
            if stats.is_rate_limited and now >= stats.rate_limit_reset:
                stats.is_rate_limited = False

            if not stats.is_rate_limited:
                stats.total_requests += 1
                return key

            attempts += 1

        # all keys limited, return least recently limited
        return min(self._keys, key=lambda k: self._stats[k].rate_limit_reset)

    def report_success(self, key: str) -> None:
        """Mark key as healthy after successful request."""
        if key in self._stats:
            self._stats[key].is_rate_limited = False

    def report_rate_limit(self, key: str, retry_after: float = 60.0) -> None:
        """Mark key as rate-limited with cooldown period."""
        if key in self._stats:
            stats = self._stats[key]
            stats.is_rate_limited = True
            stats.rate_limit_reset = time.time() + retry_after
            stats.total_errors += 1
            stats.last_error_time = time.time()

    def report_error(self, key: str) -> None:
        """Track non-rate-limit errors."""
        if key in self._stats:
            stats = self._stats[key]
            stats.total_errors += 1
            stats.last_error_time = time.time()

    def get_stats(self) -> dict[str, dict]:
        """Return stats for monitoring/debugging."""
        return {
            f"key_{i}_{_mask_key(k)}": {
                "requests": s.total_requests,
                "errors": s.total_errors,
                "rate_limited": s.is_rate_limited,
            }
            for i, (k, s) in enumerate(self._stats.items())
        }


def _mask_key(key: str) -> str:
    """Mask API key for safe logging: gsk_abc...xyz."""
    if len(key) <= 10:
        return "***"
    return f"{key[:7]}...{key[-4:]}"
