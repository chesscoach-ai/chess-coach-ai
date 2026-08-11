"""Configuration centralisee du runtime Stockfish."""

import os
import shutil
from dataclasses import dataclass
from pathlib import Path


def _positive_float(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


def _zero_or_one(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return 1 if value > 0 else 0


def default_stockfish_path() -> Path:
    backend_directory = Path(__file__).resolve().parent.parent
    configured_path = os.getenv("STOCKFISH_PATH", "").strip()
    if configured_path:
        return Path(configured_path)

    bundled_candidates = (
        backend_directory / "engines" / "stockfish.exe",
        backend_directory / "engines" / "stockfish",
    )
    for candidate in bundled_candidates:
        if candidate.is_file():
            return candidate

    system_binary = shutil.which("stockfish")
    if system_binary:
        return Path(system_binary)

    # Conserve un chemin explicite dans les erreurs sans supposer l'OS cible.
    return bundled_candidates[0]


@dataclass(frozen=True, slots=True)
class StockfishRuntimeConfig:
    path: Path
    default_depth: int = 15
    queue_timeout_seconds: float = 3.0
    analysis_timeout_seconds: float = 10.0
    total_timeout_seconds: float = 12.0
    max_retries: int = 1
    hash_mb: int = 64
    threads: int = 1
    protocol_timeout_grace_seconds: float = 0.25
    slow_operation_seconds: float = 5.0
    pool_size: int = 1
    max_queue_size: int = 6

    @classmethod
    def from_env(cls) -> "StockfishRuntimeConfig":
        try:
            depth = int(os.getenv("STOCKFISH_DEFAULT_DEPTH", "15"))
        except ValueError:
            depth = 15
        try:
            hash_mb = max(1, int(os.getenv("STOCKFISH_HASH_MB", "64")))
        except ValueError:
            hash_mb = 64
        try:
            threads = max(1, int(os.getenv("STOCKFISH_THREADS", "1")))
        except ValueError:
            threads = 1
        try:
            pool_size = max(1, int(os.getenv("STOCKFISH_POOL_SIZE", "1")))
        except ValueError:
            pool_size = 1
        try:
            max_queue_size = max(
                0,
                int(os.getenv("STOCKFISH_MAX_QUEUE_SIZE", "6")),
            )
        except ValueError:
            max_queue_size = 6
        return cls(
            path=default_stockfish_path(),
            default_depth=min(25, max(1, depth)),
            queue_timeout_seconds=_positive_float(
                "STOCKFISH_QUEUE_TIMEOUT",
                3.0,
            ),
            analysis_timeout_seconds=_positive_float(
                "STOCKFISH_ANALYSIS_TIMEOUT",
                10.0,
            ),
            total_timeout_seconds=_positive_float(
                "STOCKFISH_TOTAL_TIMEOUT",
                12.0,
            ),
            max_retries=_zero_or_one("STOCKFISH_MAX_RETRIES", 1),
            hash_mb=hash_mb,
            threads=threads,
            protocol_timeout_grace_seconds=_positive_float(
                "STOCKFISH_PROTOCOL_TIMEOUT_GRACE",
                0.25,
            ),
            slow_operation_seconds=_positive_float(
                "STOCKFISH_SLOW_OPERATION_THRESHOLD",
                5.0,
            ),
            pool_size=pool_size,
            max_queue_size=max_queue_size,
        )


default_runtime_config = StockfishRuntimeConfig.from_env()
