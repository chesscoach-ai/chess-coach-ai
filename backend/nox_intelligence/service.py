"""Orchestration sûre : policy, cache, OpenAI optionnel et fallback."""

from time import perf_counter

from .cache import (
    NoxResponseCache,
    SQLiteNoxResponseCache,
    make_nox_cache_key,
)
from .config import NoxAiConfig, default_nox_config
from .guardrails import NoxValidationError, validate_nox_response
from .metrics import NoxMetrics
from .models import NoxContext, NoxIntelligenceResult
from .policy import NoxAiPolicy, default_nox_policy
from .providers import (
    DeterministicNoxProvider,
    NoxIntelligenceProvider,
    OpenAINoxProvider,
)


class NoxIntelligenceService:
    def __init__(
        self,
        *,
        config: NoxAiConfig,
        policy: NoxAiPolicy | None = None,
        deterministic_provider: NoxIntelligenceProvider | None = None,
        ai_provider: NoxIntelligenceProvider | None = None,
        cache: NoxResponseCache | None = None,
        metrics: NoxMetrics | None = None,
    ) -> None:
        self.config = config
        self.policy = policy or default_nox_policy
        self.deterministic_provider = (
            deterministic_provider or DeterministicNoxProvider()
        )
        self.ai_provider = ai_provider
        if self.ai_provider is None and config.enabled and config.api_key:
            self.ai_provider = OpenAINoxProvider(config)
        self.cache = cache or SQLiteNoxResponseCache(config)
        self.metrics = metrics or NoxMetrics(config)

    def respond(self, context: NoxContext) -> NoxIntelligenceResult:
        self.metrics.increment("requests_total")
        decision = self.policy.decide(context)
        if (
            decision == "deterministic_only"
            or not self.config.enabled
            or not self.config.openai_configured
            or self.ai_provider is None
        ):
            reason = None
            if decision != "deterministic_only":
                reason = (
                    "ai_disabled"
                    if not self.config.enabled
                    else "openai_not_configured"
                )
            return self._deterministic(context, decision, reason)

        cache_key = make_nox_cache_key(
            context,
            model=self.config.model,
            prompt_version=self.config.prompt_version,
        )
        cached = self.cache.get(cache_key)
        if cached is not None:
            try:
                validate_nox_response(context, cached)
            except NoxValidationError:
                self.metrics.increment("validation_failures")
            else:
                self.metrics.increment("cache_hits")
                return NoxIntelligenceResult(
                    response=cached,
                    source="cache",
                    policy=decision,
                )

        self.metrics.increment("ai_requests")
        started_at = perf_counter()
        try:
            generated = self.ai_provider.generate(context)
            validate_nox_response(context, generated.response)
            latency_ms = (perf_counter() - started_at) * 1000
            self.cache.set(cache_key, generated.response)
            self.metrics.record_ai_success(
                latency_ms=latency_ms,
                input_tokens=generated.usage.input_tokens,
                output_tokens=generated.usage.output_tokens,
            )
            return NoxIntelligenceResult(
                response=generated.response,
                source="openai",
                policy=decision,
                usage=generated.usage,
            )
        except NoxValidationError:
            self.metrics.increment("validation_failures")
            self.metrics.record_error("validation_failure")
            return self._deterministic(context, decision, "validation_failure")
        except Exception as error:
            self.metrics.record_error(type(error).__name__)
            return self._deterministic(context, decision, "provider_failure")

    def _deterministic(
        self,
        context: NoxContext,
        decision: str,
        fallback_reason: str | None,
    ) -> NoxIntelligenceResult:
        self.metrics.increment("deterministic_responses")
        if fallback_reason:
            self.metrics.increment("fallbacks")
        generated = self.deterministic_provider.generate(context)
        return NoxIntelligenceResult(
            response=generated.response,
            source="deterministic",
            policy=decision,
            fallback_reason=fallback_reason,
        )

    def diagnostic(self) -> dict[str, object]:
        return {
            "ai_enabled": self.config.enabled,
            "openai_configured": self.config.openai_configured,
            "active_provider": (
                "openai"
                if self.config.enabled
                and self.config.openai_configured
                and self.ai_provider is not None
                else "deterministic"
            ),
            "model": self.config.model,
            "prompt_version": self.config.prompt_version,
            "timeout_seconds": self.config.timeout_seconds,
            "max_output_tokens": self.config.max_output_tokens,
            "cache": self.cache.status(),
            "metrics": self.metrics.snapshot().as_dict(),
        }

    def close(self) -> None:
        self.cache.close()


default_nox_service = NoxIntelligenceService(config=default_nox_config)
