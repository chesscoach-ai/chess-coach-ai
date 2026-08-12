"""Benchmark contrôlé Luna/Terra de Nox, sans appel réseau par défaut."""

from __future__ import annotations

from dataclasses import dataclass, replace
from hashlib import sha256
import json
import math
import os
from pathlib import Path
from statistics import mean, median
from time import perf_counter
from typing import Any

from .config import NoxAiConfig
from .guardrails import validate_nox_response
from .models import NoxContext
from .providers import NOX_INSTRUCTIONS, OpenAINoxProvider


BENCHMARK_VERSION = "1.3a-bis.1"
BENCHMARK_MODELS = ("gpt-5.6-luna", "gpt-5.6-terra")
REASONING_EFFORT = "none"
MAX_OUTPUT_TOKENS = 350
HARD_BUDGET_USD = 1.0
IDEAL_BUDGET_USD = 0.5
PRICING_DATE = "2026-08-12"
PRICING_USD_PER_MILLION = {
    "gpt-5.6-luna": {"input": 0.20, "output": 1.20},
    "gpt-5.6-terra": {"input": 2.00, "output": 12.00},
}
MODEL_DOCS = {
    "gpt-5.6-luna": "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
    "gpt-5.6-terra": "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
}
MANUAL_CRITERIA = (
    "factuality",
    "beginner_accessibility",
    "pedagogy",
    "personality",
    "concision",
    "repetition",
)


def require_execution_authorized(config: NoxAiConfig) -> None:
    """Verrou final, y compris pour un appel Python hors du script CLI."""
    missing: list[str] = []
    if os.getenv("RUN_NOX_LIVE_TESTS", "").casefold() != "true":
        missing.append("RUN_NOX_LIVE_TESTS=true")
    if os.getenv("NOX_BENCHMARK_APPROVED", "").casefold() != "true":
        missing.append("NOX_BENCHMARK_APPROVED=true")
    if not config.enabled:
        missing.append("NOX_AI_ENABLED=true")
    if not config.openai_configured:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise PermissionError(
            "Paid benchmark refused. Missing explicit locks: " + ", ".join(missing)
        )


@dataclass(frozen=True, slots=True)
class BenchmarkCase:
    case_id: str
    title: str
    category: str
    tags: tuple[str, ...]
    facts_summary: str
    context: NoxContext


def _move(uci: str, san: str, piece: str, color: str) -> dict[str, str]:
    return {
        "uci": uci,
        "san": san,
        "piece": piece,
        "piece_color": color,
        "from_square": uci[:2],
        "to_square": uci[2:4],
    }


def _case(
    case_id: str,
    title: str,
    category: str,
    tags: tuple[str, ...],
    facts_summary: str,
    *,
    level: str = "beginner",
    question: str = "reaction",
    played: dict[str, str] | None = None,
    best: dict[str, str] | None = None,
    classification: str | None = None,
    loss: float = 0.0,
    before: float | None = 0.0,
    after: float | None = 0.0,
    facts: dict[str, bool] | None = None,
    heuristic: str | None = None,
) -> BenchmarkCase:
    depth = "reaction" if question == "reaction" else "explanation"
    payload: dict[str, Any] = {
        "language": "fr",
        "player_level": level,
        "interaction": {"depth": depth, "question": question},
        "position": {"side_to_move": "black" if played and played["piece_color"] == "white" else "white"},
        "played_move": played,
        "classification": (
            {"code": classification, "evaluation_loss": loss}
            if classification
            else None
        ),
        "best_move": best,
        "evaluation": (
            {"before": before, "after": after, "type": "centipawn"}
            if before is not None or after is not None
            else None
        ),
        "facts": facts or {},
        "heuristics": (
            [{"id": heuristic, "source": "deterministic_rules"}]
            if heuristic
            else []
        ),
    }
    return BenchmarkCase(
        case_id, title, category, tags, facts_summary, NoxContext.model_validate(payload)
    )


def build_benchmark_cases() -> tuple[BenchmarkCase, ...]:
    """Retourne les 30 contextes immuables, majoritairement débutants."""
    p = _move
    return (
        _case("O01", "Occuper le centre", "opening", ("opening", "center", "reaction"), "e4 est excellent et contrôle le centre.", played=p("e2e4", "e4", "pion", "white"), best=p("e2e4", "e4", "pion", "white"), classification="excellent", heuristic="center_control"),
        _case("O02", "Excellent développement", "opening", ("opening", "development", "why"), "Cf3 est excellent et développe le cavalier vers une case active.", question="why", played=p("g1f3", "Cf3", "cavalier", "white"), best=p("g1f3", "Cf3", "cavalier", "white"), classification="excellent", heuristic="minor_piece_development"),
        _case("O03", "Roquer tôt", "opening", ("opening", "castle", "why", "special"), "O-O met le roi à l'abri; le roque est confirmé.", question="why", played=p("e1g1", "O-O", "roi", "white"), best=p("e1g1", "O-O", "roi", "white"), classification="excellent", facts={"castle": True}, heuristic="king_safety"),
        _case("O04", "Dame sortie trop tôt", "opening", ("opening", "mistake", "missed"), "Dh5 est une imprécision; Cc3 était préférable.", question="missed", played=p("d1h5", "Dh5", "dame", "white"), best=p("b1c3", "Cc3", "cavalier", "white"), classification="inaccuracy", loss=0.45, before=0.2, after=-0.25, heuristic="piece_coordination"),
        _case("O05", "Pion de l'aile inutile", "opening", ("opening", "plan"), "a3 est jouable mais ne développe aucune pièce; Cc3 est le plan.", question="plan", played=p("a2a3", "a3", "pion", "white"), best=p("b1c3", "Cc3", "cavalier", "white"), classification="inaccuracy", loss=0.3, heuristic="minor_piece_development"),
        _case("T01", "Pièce laissée en prise", "tactic", ("tactic", "hanging_piece", "missed"), "Fh6 laisse le fou en prise; Fg5 le sauvait.", question="missed", played=p("c1h6", "Fh6", "fou", "white"), best=p("c1g5", "Fg5", "fou", "white"), classification="blunder", loss=3.1, before=0.4, after=-2.7, heuristic="hanging_piece"),
        _case("T02", "Fourchette de cavalier", "tactic", ("tactic", "fork", "why"), "Ce5 est le meilleur coup et crée une double attaque selon les faits.", question="why", played=p("c4e5", "Ce5", "cavalier", "white"), best=p("c4e5", "Ce5", "cavalier", "white"), classification="excellent", heuristic="double_attack"),
        _case("T03", "Clouage", "tactic", ("tactic", "pin", "why"), "Fg5 est bon et exerce un clouage identifié par les règles.", question="why", played=p("c1g5", "Fg5", "fou", "white"), best=p("c1g5", "Fg5", "fou", "white"), classification="good", heuristic="pin"),
        _case("T04", "Double attaque", "tactic", ("tactic", "double_attack", "show"), "La flèche doit montrer Dd1-a4, sans inventer d'autre trajet.", question="show", played=p("d1a4", "Da4+", "dame", "white"), best=p("d1a4", "Da4+", "dame", "white"), classification="excellent", facts={"check": True}, heuristic="double_attack"),
        _case("T05", "Capture gagnante", "tactic", ("tactic", "capture", "why", "special"), "Dxd5 capture une pièce et est le meilleur coup.", question="why", played=p("d1d5", "Dxd5", "dame", "white"), best=p("d1d5", "Dxd5", "dame", "white"), classification="excellent", facts={"capture": True}, heuristic="material_change"),
        _case("T06", "Échec forcé", "tactic", ("tactic", "check", "reaction", "special"), "Fxf7+ capture et donne échec, sans être mat.", played=p("c4f7", "Fxf7+", "fou", "white"), best=p("c4f7", "Fxf7+", "fou", "white"), classification="excellent", facts={"capture": True, "check": True}, heuristic="forcing_check"),
        _case("T07", "Mat en un", "tactic", ("tactic", "checkmate", "reaction", "special"), "Dh7# est un échec et mat confirmé.", played=p("h5h7", "Dh7#", "dame", "white"), best=p("h5h7", "Dh7#", "dame", "white"), classification="excellent", facts={"check": True, "checkmate": True}, heuristic="forcing_check"),
        _case("E01", "Petite imprécision", "error", ("error", "inaccuracy", "reaction"), "h3 est une imprécision légère; Cc3 était meilleur.", played=p("h2h3", "h3", "pion", "white"), best=p("b1c3", "Cc3", "cavalier", "white"), classification="inaccuracy", loss=0.35),
        _case("E02", "Erreur de sécurité", "error", ("error", "mistake", "why"), "f3 est une erreur qui fragilise le roi; e4 était meilleur.", question="why", played=p("f2f3", "f3", "pion", "white"), best=p("e2e4", "e4", "pion", "white"), classification="mistake", loss=1.2, before=0.2, after=-1.0, heuristic="king_safety"),
        _case("E03", "Gaffe matérielle", "error", ("error", "blunder", "reaction"), "Dd3 est une gaffe qui perd du matériel; Dd2 était meilleur.", played=p("d1d3", "Dd3", "dame", "white"), best=p("d1d2", "Dd2", "dame", "white"), classification="blunder", loss=4.6, before=0.5, after=-4.1, heuristic="material_change"),
        _case("E04", "Pièce perdue", "error", ("error", "lost_piece", "missed"), "Cb5 perd le cavalier; Cc3 le conservait.", question="missed", played=p("a3b5", "Cb5", "cavalier", "white"), best=p("a3c4", "Cc4", "cavalier", "white"), classification="blunder", loss=3.0, heuristic="material_change"),
        _case("E05", "Roi exposé", "error", ("error", "exposed_king", "plan"), "g4 expose le roi; le plan fiable est O-O.", question="plan", played=p("g2g4", "g4", "pion", "white"), best=p("e1g1", "O-O", "roi", "white"), classification="mistake", loss=1.4, heuristic="king_safety"),
        _case("G01", "Meilleur coup", "good_decision", ("good_decision", "best_move", "reaction"), "d4 est le premier choix et contrôle le centre.", played=p("d2d4", "d4", "pion", "white"), best=p("d2d4", "d4", "pion", "white"), classification="excellent", heuristic="center_control"),
        _case("G02", "Solide sans être premier", "good_decision", ("good_decision", "solid", "why"), "Cc3 est bon, même si d4 était légèrement meilleur.", question="why", played=p("b1c3", "Cc3", "cavalier", "white"), best=p("d2d4", "d4", "pion", "white"), classification="good", loss=0.12, heuristic="minor_piece_development"),
        _case("G03", "Défense précise", "good_decision", ("good_decision", "defense", "why"), "Tf1 défend correctement une menace identifiée.", question="why", played=p("a1f1", "Tf1", "tour", "white"), best=p("a1f1", "Tf1", "tour", "white"), classification="excellent", heuristic="defense"),
        _case("G04", "Bon échange", "good_decision", ("good_decision", "exchange", "why", "special"), "Fxd5 est une bonne capture et l'échange est favorable.", question="why", played=p("c4d5", "Fxd5", "fou", "white"), best=p("c4d5", "Fxd5", "fou", "white"), classification="good", facts={"capture": True}, heuristic="material_change"),
        _case("S01", "Promotion", "special", ("special", "promotion", "reaction"), "e8=D est une promotion confirmée.", played=p("e7e8q", "e8=D", "pion", "white"), best=p("e7e8q", "e8=D", "pion", "white"), classification="excellent", facts={"promotion": True}),
        _case("S02", "Mat adverse", "special", ("special", "checkmate", "why"), "Dg2# des noirs est un mat confirmé.", level="intermediate", question="why", played=p("g3g2", "Dg2#", "dame", "black"), best=p("g3g2", "Dg2#", "dame", "black"), classification="excellent", facts={"check": True, "checkmate": True}),
        _case("S03", "Données insuffisantes", "special", ("special", "insufficient_data", "why"), "Aucun coup ni fait n'est fourni; Nox doit le dire.", level="intermediate", question="why", played=None, best=None, classification=None, before=None, after=None),
        _case("I01", "Pourquoi ce coup ?", "interaction", ("interaction", "why"), "Expliquer e4 avec le seul contrôle du centre fourni.", level="intermediate", question="why", played=p("e2e4", "e4", "pion", "white"), best=p("e2e4", "e4", "pion", "white"), classification="excellent", heuristic="center_control"),
        _case("I02", "Quel plan ?", "interaction", ("interaction", "plan"), "Proposer le plan Cc3 sans inventer de variante.", level="intermediate", question="plan", played=p("h2h3", "h3", "pion", "white"), best=p("b1c3", "Cc3", "cavalier", "white"), classification="inaccuracy", loss=0.3, heuristic="minor_piece_development"),
        _case("I03", "Qu'ai-je raté ?", "interaction", ("interaction", "missed"), "Comparer Fh4 à Fg3, le meilleur coup fourni.", level="intermediate", question="missed", played=p("g5h4", "Fh4", "fou", "white"), best=p("g5g3", "Fg3", "fou", "white"), classification="mistake", loss=1.8),
        _case("I04", "Montre-moi", "interaction", ("interaction", "show"), "Afficher uniquement le trajet e2-e4.", level="intermediate", question="show", played=p("e2e4", "e4", "pion", "white"), best=p("e2e4", "e4", "pion", "white"), classification="excellent", heuristic="center_control"),
        _case("A01", "Plan positionnel avancé", "interaction", ("interaction", "plan", "advanced"), "Le plan fiable est l'amélioration de la coordination via Tfd1.", level="advanced", question="plan", played=p("a1d1", "Tad1", "tour", "white"), best=p("f1d1", "Tfd1", "tour", "white"), classification="good", loss=0.18, heuristic="piece_coordination"),
        _case("A02", "Sacrifice tactique", "tactic", ("tactic", "capture", "advanced", "why"), "Txf7+ est une excellente capture avec échec; aucune suite n'est fournie.", level="advanced", question="why", played=p("f1f7", "Txf7+", "tour", "white"), best=p("f1f7", "Txf7+", "tour", "white"), classification="excellent", facts={"capture": True, "check": True}, heuristic="forcing_check"),
    )


def canonical_input(context: NoxContext, prompt_version: str = "1.0") -> str:
    return json.dumps(
        context.model_dump(mode="json"),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def context_fingerprint(context: NoxContext) -> str:
    return sha256(canonical_input(context).encode("utf-8")).hexdigest()


def preflight_estimate() -> dict[str, Any]:
    cases = build_benchmark_cases()
    instruction = f"{NOX_INSTRUCTIONS}\nVersion du prompt: 1.0."
    # Un token ne peut pas contenir davantage d'octets que le texte encodé :
    # le nombre d'octets UTF-8 est donc une borne volontairement conservatrice.
    input_token_upper_bound = sum(
        len(instruction.encode("utf-8"))
        + len(canonical_input(case.context).encode("utf-8"))
        for case in cases
    )
    output_token_upper_bound = len(cases) * MAX_OUTPUT_TOKENS
    models: dict[str, Any] = {}
    for model in BENCHMARK_MODELS:
        rates = PRICING_USD_PER_MILLION[model]
        maximum = (
            input_token_upper_bound * rates["input"]
            + output_token_upper_bound * rates["output"]
        ) / 1_000_000
        models[model] = {
            "calls": len(cases),
            "input_token_upper_bound": input_token_upper_bound,
            "output_token_upper_bound": output_token_upper_bound,
            "maximum_cost_usd": round(maximum, 6),
        }
    total = sum(item["maximum_cost_usd"] for item in models.values())
    result = {
        "benchmark_version": BENCHMARK_VERSION,
        "pricing_date": PRICING_DATE,
        "models": models,
        "case_count": len(cases),
        "total_calls": len(cases) * len(BENCHMARK_MODELS),
        "parameters": {
            "reasoning_effort": REASONING_EFFORT,
            "temperature": "not_overridden",
            "structured_output": "NoxResponse/1.0",
            "prompt_version": "1.0",
            "store": False,
            "cache": "disabled_direct_unique_calls",
        },
        "max_output_tokens_per_call": MAX_OUTPUT_TOKENS,
        "total_maximum_cost_usd": round(total, 6),
        "hard_budget_usd": HARD_BUDGET_USD,
        "ideal_budget_usd": IDEAL_BUDGET_USD,
    }
    if total > HARD_BUDGET_USD:
        raise RuntimeError("Benchmark estimate exceeds the hard $1 budget")
    return result


def execute_benchmark(config: NoxAiConfig) -> dict[str, Any]:
    """Effectue une fois chaque appel. L'appelant doit avoir validé les verrous."""
    require_execution_authorized(config)
    preflight = preflight_estimate()
    rows: list[dict[str, Any]] = []
    for model in BENCHMARK_MODELS:
        model_config = replace(
            config, model=model, max_output_tokens=MAX_OUTPUT_TOKENS
        )
        provider = OpenAINoxProvider(
            model_config, reasoning_effort=REASONING_EFFORT
        )
        rates = PRICING_USD_PER_MILLION[model]
        for case in build_benchmark_cases():
            started = perf_counter()
            try:
                generated = provider.generate(case.context)
                latency_ms = (perf_counter() - started) * 1000
                cost = (
                    generated.usage.input_tokens * rates["input"]
                    + generated.usage.output_tokens * rates["output"]
                ) / 1_000_000
                guardrails_valid = True
                guardrail_error = None
                try:
                    validate_nox_response(case.context, generated.response)
                except Exception as error:
                    guardrails_valid = False
                    guardrail_error = type(error).__name__
                rows.append({
                    "case_id": case.case_id,
                    "model": model,
                    "context_sha256": context_fingerprint(case.context),
                    "latency_ms": round(latency_ms, 2),
                    "input_tokens": generated.usage.input_tokens,
                    "output_tokens": generated.usage.output_tokens,
                    "cost_usd": round(cost, 8),
                    "json_conformity": True,
                    "guardrails_valid": guardrails_valid,
                    "error": guardrail_error,
                    "manual_scores": {criterion: None for criterion in MANUAL_CRITERIA},
                    "weighted_manual_score": None,
                    "response": generated.response.model_dump(mode="json"),
                })
            except Exception as error:  # reportable benchmark failure
                rows.append({
                    "case_id": case.case_id,
                    "model": model,
                    "context_sha256": context_fingerprint(case.context),
                    "latency_ms": round((perf_counter() - started) * 1000, 2),
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost_usd": 0.0,
                    "json_conformity": False,
                    "guardrails_valid": False,
                    "error": type(error).__name__,
                    "manual_scores": {criterion: None for criterion in MANUAL_CRITERIA},
                    "weighted_manual_score": None,
                    "response": None,
                })
    return {
        "benchmark_version": BENCHMARK_VERSION,
        "preflight": preflight,
        "cases": [
            {
                "case_id": case.case_id,
                "title": case.title,
                "category": case.category,
                "tags": case.tags,
                "facts_summary": case.facts_summary,
                "context": case.context.model_dump(mode="json"),
            }
            for case in build_benchmark_cases()
        ],
        "results": rows,
        "statistics": benchmark_statistics(rows),
    }


def _percentile(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    return ordered[min(len(ordered) - 1, math.ceil(percentile * len(ordered)) - 1)]


def benchmark_statistics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    stats: dict[str, Any] = {}
    for model in BENCHMARK_MODELS:
        selected = [row for row in rows if row["model"] == model]
        latencies = [float(row["latency_ms"]) for row in selected]
        successful = [row for row in selected if row["error"] is None]
        total_cost = sum(float(row["cost_usd"]) for row in selected)
        average_cost = total_cost / len(selected) if selected else 0.0
        scenarios = {
            "low_25": 25,
            "normal_100": 100,
            "intensive_250": 250,
        }
        per_user = {
            scenario: round(responses * average_cost, 6)
            for scenario, responses in scenarios.items()
        }
        projections = {
            str(users): {
                scenario: {
                    "responses_per_user": responses,
                    "ai_cost_per_user_usd": per_user[scenario],
                    "monthly_openai_cost_usd": round(
                        users * responses * average_cost, 2
                    ),
                }
                for scenario, responses in scenarios.items()
            }
            for users in (100, 1_000, 10_000)
        }
        stats[model] = {
            "calls": len(selected),
            "successes": len(successful),
            "failures": len(selected) - len(successful),
            "validation_failures": sum(
                1 for row in selected if not row["guardrails_valid"]
            ),
            "potential_fallbacks": sum(
                1 for row in selected if row["error"] is not None
            ),
            "latency_ms": {
                "average": round(mean(latencies), 2) if latencies else 0.0,
                "median": round(median(latencies), 2) if latencies else 0.0,
                "p95": round(_percentile(latencies, 0.95), 2),
            },
            "average_input_tokens": round(mean([row["input_tokens"] for row in successful]), 2) if successful else 0.0,
            "average_output_tokens": round(mean([row["output_tokens"] for row in successful]), 2) if successful else 0.0,
            "average_response_characters": round(
                mean(
                    len(json.dumps(row["response"], ensure_ascii=False))
                    for row in successful
                ),
                2,
            ) if successful else 0.0,
            "total_cost_usd": round(total_cost, 6),
            "average_cost_per_response_usd": round(average_cost, 8),
            "ai_cost_per_user_usd": per_user,
            "monthly_ai_cost_projections": projections,
            "commercial_comparison": {
                "monthly_price_eur": 2.0,
                "annual_price_eur": 19.99,
                "annual_monthly_equivalent_eur": round(19.99 / 12, 4),
                "scope": "AI inference only; excludes hosting, taxes and store fees",
                "currency_note": "USD AI costs and EUR revenue are not converted",
            },
        }
    return stats


def write_markdown_report(payload: dict[str, Any], path: Path) -> None:
    lines = [
        "# Benchmark contrôlé Nox — Luna vs Terra",
        "",
        f"Version : `{payload['benchmark_version']}`",
        "",
        "Notation pondérée : factualité 30 %, pédagogie 25 %, accessibilité 20 %, personnalité 15 %, concision 5 %, répétition 5 %. Une hallucination factuelle majeure disqualifie la réponse.",
        "",
    ]
    indexed = {
        (row["case_id"], row["model"]): row for row in payload["results"]
    }
    for case in payload["cases"]:
        lines.extend((
            f"## {case['case_id']} — {case['title']}",
            "",
            f"ChessFacts résumé : {case['facts_summary']}",
            "",
        ))
        for model, label in (("gpt-5.6-luna", "LUNA"), ("gpt-5.6-terra", "TERRA")):
            row = indexed[(case["case_id"], model)]
            response = (
                json.dumps(row["response"], ensure_ascii=False, indent=2)
                if row["response"] is not None
                else f"Échec : {row['error']}"
            )
            lines.extend((
                f"### {label}",
                "",
                "```json",
                response,
                "```",
                "",
                f"Latence : {row['latency_ms']:.2f} ms · Tokens : {row['input_tokens']} entrée / {row['output_tokens']} sortie · Coût : ${row['cost_usd']:.8f} · JSON : {'valide' if row['json_conformity'] else 'invalide'} · Garde-fous : {'valides' if row['guardrails_valid'] else 'échec'}",
                "",
            ))
        lines.extend((
            "Notes manuelles (/5) : factualité __ · accessibilité __ · pédagogie __ · personnalité __ · concision __ · répétition __",
            "",
            "Score pondéré : __ / 5 · Disqualification factuelle : oui / non",
            "",
        ))
    lines.extend(("## Statistiques et projections", "", "```json", json.dumps(payload["statistics"], ensure_ascii=False, indent=2), "```"))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
