"""Prépare ou exécute, sous triple verrou, le benchmark Nox Luna/Terra."""

from argparse import ArgumentParser
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from nox_intelligence.benchmark import (
    BENCHMARK_MODELS,
    execute_benchmark,
    preflight_estimate,
    write_markdown_report,
)
from nox_intelligence.config import NoxAiConfig


def execution_allowed(config: NoxAiConfig, execute: bool) -> tuple[bool, list[str]]:
    missing: list[str] = []
    if not execute:
        missing.append("--execute")
    if os.getenv("RUN_NOX_LIVE_TESTS", "").casefold() != "true":
        missing.append("RUN_NOX_LIVE_TESTS=true")
    if os.getenv("NOX_BENCHMARK_APPROVED", "").casefold() != "true":
        missing.append("NOX_BENCHMARK_APPROVED=true")
    if not config.enabled:
        missing.append("NOX_AI_ENABLED=true")
    if not config.openai_configured:
        missing.append("OPENAI_API_KEY")
    return not missing, missing


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".data/nox-model-benchmark.json"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path(".data/nox-model-benchmark.md"),
    )
    args = parser.parse_args()

    estimate = preflight_estimate()
    if not args.execute:
        print(json.dumps(estimate, ensure_ascii=False, indent=2))
        return

    config = NoxAiConfig.from_env()
    allowed, missing = execution_allowed(config, args.execute)
    if not allowed:
        raise SystemExit(
            "Paid benchmark refused. Missing explicit locks: " + ", ".join(missing)
        )
    if tuple(BENCHMARK_MODELS) != ("gpt-5.6-luna", "gpt-5.6-terra"):
        raise SystemExit("Benchmark model allowlist was modified")

    payload = execute_benchmark(config)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_markdown_report(payload, args.report)
    print(f"Benchmark saved to {args.output} and {args.report}")


if __name__ == "__main__":
    main()
