"""Configuration serveur de Nox Intelligence, gratuite par défaut."""

from dataclasses import dataclass
import os
from pathlib import Path


def _flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().casefold() in {"1", "true", "yes", "on"}


def _positive_int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


def _non_negative_float(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value >= 0 else default


@dataclass(frozen=True, slots=True)
class NoxAiConfig:
    enabled: bool
    api_key: str | None
    model: str
    timeout_seconds: float
    max_output_tokens: int
    prompt_version: str
    cache_path: Path
    cache_ttl_days: int
    cache_max_entries: int
    input_cost_per_million: float
    output_cost_per_million: float

    @property
    def openai_configured(self) -> bool:
        return bool(self.api_key)

    @classmethod
    def from_env(cls) -> "NoxAiConfig":
        backend_dir = Path(__file__).resolve().parent.parent
        cache_path = os.getenv("NOX_CACHE_SQLITE_PATH", "").strip()
        return cls(
            enabled=_flag("NOX_AI_ENABLED", False),
            api_key=os.getenv("OPENAI_API_KEY", "").strip() or None,
            model=os.getenv("NOX_OPENAI_MODEL", "gpt-5.6-luna").strip()
            or "gpt-5.6-luna",
            timeout_seconds=_non_negative_float("NOX_AI_TIMEOUT", 8.0),
            max_output_tokens=_positive_int("NOX_AI_MAX_OUTPUT_TOKENS", 350),
            prompt_version=os.getenv("NOX_PROMPT_VERSION", "1.0").strip()
            or "1.0",
            cache_path=(
                Path(cache_path)
                if cache_path
                else backend_dir / ".data" / "nox-response-cache.sqlite3"
            ),
            cache_ttl_days=_positive_int("NOX_CACHE_TTL_DAYS", 30),
            cache_max_entries=_positive_int("NOX_CACHE_MAX_ENTRIES", 5000),
            input_cost_per_million=_non_negative_float(
                "NOX_INPUT_COST_PER_MILLION", 0.0
            ),
            output_cost_per_million=_non_negative_float(
                "NOX_OUTPUT_COST_PER_MILLION", 0.0
            ),
        )


default_nox_config = NoxAiConfig.from_env()
