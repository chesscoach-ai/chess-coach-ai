import json
import pytest

from nox_intelligence.config import NoxAiConfig

from nox_intelligence.benchmark import (
    BENCHMARK_MODELS,
    HARD_BUDGET_USD,
    IDEAL_BUDGET_USD,
    MAX_OUTPUT_TOKENS,
    build_benchmark_cases,
    context_fingerprint,
    preflight_estimate,
    require_execution_authorized,
)


def test_dataset_has_30_unique_representative_cases():
    cases = build_benchmark_cases()
    assert len(cases) == 30
    assert len({case.case_id for case in cases}) == 30
    tags = {tag for case in cases for tag in case.tags}
    required = {
        "opening", "development", "center", "castle", "tactic", "hanging_piece",
        "fork", "pin", "double_attack", "capture", "check", "checkmate",
        "error", "inaccuracy", "mistake", "blunder", "lost_piece",
        "exposed_king", "good_decision", "best_move", "solid", "defense",
        "exchange", "promotion", "insufficient_data", "reaction", "why",
        "plan", "missed", "show",
    }
    assert required <= tags


def test_dataset_is_mainly_beginner_with_other_levels_present():
    levels = [case.context.player_level for case in build_benchmark_cases()]
    assert levels.count("beginner") > len(levels) / 2
    assert "intermediate" in levels
    assert "advanced" in levels


def test_contexts_are_stable_and_reusable_identically_for_both_models():
    first = [context_fingerprint(case.context) for case in build_benchmark_cases()]
    second = [context_fingerprint(case.context) for case in build_benchmark_cases()]
    assert first == second
    assert len(first) == 30
    assert BENCHMARK_MODELS == ("gpt-5.6-luna", "gpt-5.6-terra")


def test_preflight_is_conservative_and_below_both_budgets():
    estimate = preflight_estimate()
    assert estimate["case_count"] == 30
    assert estimate["total_calls"] == 60
    assert estimate["max_output_tokens_per_call"] == MAX_OUTPUT_TOKENS
    assert estimate["parameters"]["reasoning_effort"] == "none"
    assert estimate["parameters"]["cache"] == "disabled_direct_unique_calls"
    assert estimate["total_maximum_cost_usd"] < IDEAL_BUDGET_USD
    assert estimate["total_maximum_cost_usd"] < HARD_BUDGET_USD
    assert set(estimate["models"]) == set(BENCHMARK_MODELS)


def test_preflight_contains_no_secret_or_user_identifier(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "forbidden-secret")
    monkeypatch.setenv("USER_EMAIL", "person@example.test")
    serialized = json.dumps(preflight_estimate())
    assert "forbidden-secret" not in serialized
    assert "person@example.test" not in serialized


def test_paid_execution_is_refused_without_explicit_approval(tmp_path, monkeypatch):
    monkeypatch.delenv("RUN_NOX_LIVE_TESTS", raising=False)
    monkeypatch.delenv("NOX_BENCHMARK_APPROVED", raising=False)
    config = NoxAiConfig(
        enabled=True,
        api_key="not-logged",
        model="gpt-5.6-luna",
        timeout_seconds=8.0,
        max_output_tokens=350,
        prompt_version="1.0",
        cache_path=tmp_path / "cache.sqlite3",
        cache_ttl_days=30,
        cache_max_entries=100,
        input_cost_per_million=0,
        output_cost_per_million=0,
    )
    with pytest.raises(PermissionError, match="NOX_BENCHMARK_APPROVED"):
        require_execution_authorized(config)
