from dataclasses import replace
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from nox_intelligence.cache import MemoryNoxResponseCache, make_nox_cache_key
from nox_intelligence.config import NoxAiConfig
from nox_intelligence.guardrails import NoxValidationError, validate_nox_response
from nox_intelligence.metrics import NoxMetrics
from nox_intelligence.models import (
    NoxArrow,
    NoxContext,
    NoxResponse,
    NoxUsage,
    NoxVisual,
)
from nox_intelligence.policy import NoxAiPolicy
from nox_intelligence.providers import (
    GeneratedNoxResponse,
    OpenAINoxProvider,
)
from nox_intelligence.service import NoxIntelligenceService


def config(tmp_path: Path, **overrides) -> NoxAiConfig:
    base = NoxAiConfig(
        enabled=False,
        api_key=None,
        model="test-model",
        timeout_seconds=1.0,
        max_output_tokens=200,
        prompt_version="1.0",
        cache_path=tmp_path / "nox.sqlite3",
        cache_ttl_days=1,
        cache_max_entries=20,
        input_cost_per_million=1.0,
        output_cost_per_million=2.0,
    )
    return replace(base, **overrides)


def context(
    *,
    question: str = "why",
    classification: str = "blunder",
) -> NoxContext:
    return NoxContext.model_validate(
        {
            "interaction": {"depth": "explanation", "question": question},
            "position": {"side_to_move": "white"},
            "played_move": {
                "uci": "f2f3",
                "san": "f3",
                "piece": "pion",
                "piece_color": "white",
                "from_square": "f2",
                "to_square": "f3",
            },
            "classification": {
                "code": classification,
                "evaluation_loss": 1.4,
            },
            "best_move": {
                "uci": "e2e4",
                "san": "e4",
                "piece": "pion",
                "piece_color": "white",
                "from_square": "e2",
                "to_square": "e4",
            },
            "evaluation": {"before": 0.3, "after": -1.1, "type": "centipawn"},
            "facts": {},
            "heuristics": [
                {"id": "center_control", "source": "deterministic_rules"}
            ],
        }
    )


def valid_response() -> NoxResponse:
    return NoxResponse(
        state="warning",
        title="Un détail important",
        message="Le pion f quitte une case utile pour la sécurité du roi.",
        referenced_move_uci="f2f3",
        visual=NoxVisual(
            arrows=(NoxArrow(from_square="f2", to_square="f3"),),
            highlights=("f3",),
        ),
    )


class FakeProvider:
    def __init__(self, response: NoxResponse | None = None, error: Exception | None = None):
        self.response = response or valid_response()
        self.error = error
        self.calls = 0

    def generate(self, _: NoxContext) -> GeneratedNoxResponse:
        self.calls += 1
        if self.error:
            raise self.error
        return GeneratedNoxResponse(
            self.response,
            NoxUsage(input_tokens=100, output_tokens=20),
        )


def test_context_and_response_reject_unknown_fields_and_invalid_json():
    with pytest.raises(ValidationError):
        NoxContext.model_validate({"unexpected": True})
    with pytest.raises(ValidationError):
        NoxResponse.model_validate_json('{"state":"tip"}')


@pytest.mark.parametrize(
    ("question", "classification", "expected"),
    [
        ("show", "blunder", "deterministic_only"),
        ("reaction", "good", "deterministic_only"),
        ("reaction", "blunder", "ai_preferred"),
        ("why", "good", "ai_preferred"),
        ("plan", "excellent", "ai_preferred"),
        ("missed", "mistake", "ai_preferred"),
    ],
)
def test_eligibility_policy(question, classification, expected):
    assert NoxAiPolicy().decide(
        context(question=question, classification=classification)
    ) == expected


def test_guardrails_reject_unknown_move_arrow_and_claim():
    with pytest.raises(NoxValidationError):
        validate_nox_response(
            context(),
            valid_response().model_copy(update={"referenced_move_uci": "a2a4"}),
        )
    with pytest.raises(NoxValidationError):
        validate_nox_response(
            context(),
            valid_response().model_copy(
                update={
                    "visual": NoxVisual(
                        arrows=(NoxArrow(from_square="a2", to_square="a4"),)
                    )
                }
            ),
        )
    with pytest.raises(NoxValidationError):
        validate_nox_response(
            context(),
            valid_response().model_copy(update={"message": "Ce coup fait échec."}),
        )


def test_ai_disabled_and_missing_key_use_deterministic_fallback(tmp_path):
    fake = FakeProvider()
    disabled = NoxIntelligenceService(
        config=config(tmp_path),
        ai_provider=fake,
        cache=MemoryNoxResponseCache(),
    ).respond(context())
    assert disabled.source == "deterministic"
    assert disabled.fallback_reason == "ai_disabled"
    assert fake.calls == 0

    missing_key = NoxIntelligenceService(
        config=config(tmp_path, enabled=True),
        ai_provider=fake,
        cache=MemoryNoxResponseCache(),
    ).respond(context())
    assert missing_key.source == "deterministic"
    assert missing_key.fallback_reason == "openai_not_configured"
    assert fake.calls == 0


def test_valid_ai_response_is_cached_and_metrics_are_counted(tmp_path):
    fake = FakeProvider()
    cfg = config(tmp_path, enabled=True, api_key="test")
    cache = MemoryNoxResponseCache()
    service = NoxIntelligenceService(
        config=cfg, ai_provider=fake, cache=cache
    )
    first = service.respond(context())
    second = service.respond(context())
    assert first.source == "openai"
    assert second.source == "cache"
    assert fake.calls == 1
    snapshot = service.metrics.snapshot()
    assert snapshot.ai_requests == 1
    assert snapshot.ai_success == 1
    assert snapshot.cache_hits == 1
    assert snapshot.input_tokens == 100
    assert snapshot.output_tokens == 20
    assert snapshot.estimated_cost == pytest.approx(0.00014)


@pytest.mark.parametrize("error", [TimeoutError(), ConnectionError(), ValueError("bad json")])
def test_provider_failure_timeout_network_or_invalid_json_falls_back(tmp_path, error):
    service = NoxIntelligenceService(
        config=config(tmp_path, enabled=True, api_key="test"),
        ai_provider=FakeProvider(error=error),
        cache=MemoryNoxResponseCache(),
    )
    result = service.respond(context())
    assert result.source == "deterministic"
    assert result.fallback_reason == "provider_failure"
    assert service.metrics.snapshot().fallbacks == 1


def test_hallucinated_response_is_rejected_and_falls_back(tmp_path):
    hallucination = valid_response().model_copy(
        update={"referenced_move_uci": "a2a4"}
    )
    service = NoxIntelligenceService(
        config=config(tmp_path, enabled=True, api_key="test"),
        ai_provider=FakeProvider(hallucination),
        cache=MemoryNoxResponseCache(),
    )
    result = service.respond(context())
    assert result.source == "deterministic"
    assert result.fallback_reason == "validation_failure"
    assert service.metrics.snapshot().validation_failures == 1


def test_cache_key_changes_with_model_prompt_and_level(tmp_path):
    current = context()
    base = make_nox_cache_key(current, model="a", prompt_version="1")
    assert base != make_nox_cache_key(current, model="b", prompt_version="1")
    assert base != make_nox_cache_key(current, model="a", prompt_version="2")
    assert base != make_nox_cache_key(
        current.model_copy(update={"player_level": "advanced"}),
        model="a",
        prompt_version="1",
    )


def test_openai_provider_uses_structured_parse_without_retry(tmp_path):
    calls = []

    class Responses:
        def parse(self, **kwargs):
            calls.append(kwargs)
            return SimpleNamespace(
                output_parsed=valid_response(),
                usage=SimpleNamespace(input_tokens=12, output_tokens=7),
            )

    fake_client = SimpleNamespace(responses=Responses())
    provider = OpenAINoxProvider(
        config(tmp_path, enabled=True, api_key="test"),
        client=fake_client,
    )
    generated = provider.generate(context())
    assert generated.response == valid_response()
    assert calls[0]["text_format"] is NoxResponse
    assert calls[0]["store"] is False
    assert "email" not in calls[0]["input"]


def test_openai_provider_can_fix_reasoning_effort_for_benchmark(tmp_path):
    calls = []

    class Responses:
        def parse(self, **kwargs):
            calls.append(kwargs)
            return SimpleNamespace(
                output_parsed=valid_response(),
                usage=SimpleNamespace(input_tokens=12, output_tokens=7),
            )

    provider = OpenAINoxProvider(
        config(tmp_path, enabled=True, api_key="test"),
        client=SimpleNamespace(responses=Responses()),
        reasoning_effort="none",
    )
    provider.generate(context())
    assert calls[0]["reasoning"] == {"effort": "none"}


def test_no_openai_secret_can_be_exposed_by_frontend():
    frontend = Path(__file__).resolve().parents[2] / "frontend"
    source_roots = [
        frontend / name
        for name in ("app", "components", "hooks", "lib", "services", "types")
    ]
    source_files = []
    for root in source_roots:
        for pattern in ("*.ts", "*.tsx", "*.js"):
            source_files.extend(root.rglob(pattern))
    combined = "\n".join(path.read_text(encoding="utf-8") for path in source_files)
    assert "NEXT_PUBLIC_OPENAI_API_KEY" not in combined
    assert "OPENAI_API_KEY" not in combined


@pytest.mark.skipif(
    os.getenv("RUN_NOX_LIVE_TESTS", "").casefold() != "true"
    or not os.getenv("OPENAI_API_KEY"),
    reason="Live Nox tests are disabled by default",
)
def test_optional_live_openai_structured_response(tmp_path):
    cfg = config(
        tmp_path,
        enabled=True,
        api_key=os.environ["OPENAI_API_KEY"],
        model=os.getenv("NOX_OPENAI_MODEL", "gpt-5.6-luna"),
    )
    generated = OpenAINoxProvider(cfg).generate(context())
    validate_nox_response(context(), generated.response)
