"""Banc Nox de 30 cas, hors ligne par défaut.

Sans ``--live``, il évalue uniquement la policy et le fallback déterministe.
Un appel réel exige simultanément ``--live``, ``RUN_NOX_LIVE_TESTS=true``,
``NOX_AI_ENABLED=true`` et ``OPENAI_API_KEY``.
"""

from argparse import ArgumentParser
from dataclasses import replace
import json
import os
from pathlib import Path
import sys
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from nox_intelligence.config import NoxAiConfig
from nox_intelligence.models import NoxContext
from nox_intelligence.providers import (
    DeterministicNoxProvider,
    OpenAINoxProvider,
)
from nox_intelligence.policy import NoxAiPolicy


SCENARIOS = [
    ("opening_center", "excellent", "center_control", "reaction"),
    ("good_development", "good", "minor_piece_development", "reaction"),
    ("inaccuracy", "inaccuracy", "piece_coordination", "missed"),
    ("mistake", "mistake", "king_safety", "missed"),
    ("blunder", "blunder", "material_change", "why"),
    ("capture", "good", "material_change", "why"),
    ("check", "excellent", "forcing_check", "why"),
    ("checkmate", "excellent", "forcing_check", "why"),
    ("castle", "good", "king_safety", "plan"),
    ("promotion", "excellent", "promotion", "plan"),
]


def build_cases() -> list[tuple[str, NoxContext]]:
    cases: list[tuple[str, NoxContext]] = []
    for level in ("beginner", "intermediate", "advanced"):
        for name, classification, heuristic, question in SCENARIOS:
            special = name
            facts = {
                "capture": special == "capture",
                "check": special in {"check", "checkmate"},
                "checkmate": special == "checkmate",
                "castle": special == "castle",
                "promotion": special == "promotion",
            }
            cases.append(
                (
                    f"{level}:{name}",
                    NoxContext.model_validate(
                        {
                            "language": "fr",
                            "player_level": level,
                            "interaction": {
                                "depth": "reaction"
                                if question == "reaction"
                                else "explanation",
                                "question": question,
                            },
                            "position": {"side_to_move": "white"},
                            "played_move": {
                                "uci": "e2e4",
                                "san": "e4",
                                "piece": "pion",
                                "piece_color": "white",
                                "from_square": "e2",
                                "to_square": "e4",
                            },
                            "classification": {
                                "code": classification,
                                "evaluation_loss": 0.0
                                if classification in {"excellent", "good"}
                                else 1.5,
                            },
                            "best_move": {
                                "uci": "e2e4",
                                "san": "e4",
                                "piece": "pion",
                                "piece_color": "white",
                                "from_square": "e2",
                                "to_square": "e4",
                            },
                            "evaluation": {
                                "before": 0.3,
                                "after": 0.3,
                                "type": "centipawn",
                            },
                            "facts": facts,
                            "heuristics": [
                                {"id": heuristic, "source": "deterministic_rules"}
                            ],
                        }
                    ),
                )
            )
    return cases


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--models", nargs="*", default=[])
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    config = NoxAiConfig.from_env()
    live_allowed = (
        args.live
        and os.getenv("RUN_NOX_LIVE_TESTS", "").casefold() == "true"
        and config.enabled
        and config.openai_configured
    )
    if args.live and not live_allowed:
        raise SystemExit(
            "Live benchmark refused: enable RUN_NOX_LIVE_TESTS, "
            "NOX_AI_ENABLED and OPENAI_API_KEY explicitly."
        )

    models = args.models or [config.model]
    results = []
    policy = NoxAiPolicy()
    for model in models:
        model_config = replace(config, model=model)
        provider = (
            OpenAINoxProvider(model_config)
            if live_allowed
            else DeterministicNoxProvider()
        )
        for case_id, context in build_cases():
            started = perf_counter()
            generated = provider.generate(context)
            latency_ms = (perf_counter() - started) * 1000
            results.append(
                {
                    "case_id": case_id,
                    "model": model if live_allowed else "deterministic",
                    "policy": policy.decide(context),
                    "latency_ms": round(latency_ms, 2),
                    "input_tokens": generated.usage.input_tokens,
                    "output_tokens": generated.usage.output_tokens,
                    "scores": {
                        "factuality": None,
                        "pedagogy": None,
                        "personality": None,
                        "concision": None,
                        "beginner_accessibility": None,
                    },
                    "response": generated.response.model_dump(mode="json"),
                }
            )
    payload = json.dumps(results, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(payload, encoding="utf-8")
    else:
        print(payload)


if __name__ == "__main__":
    main()
