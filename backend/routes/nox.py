"""Route compacte de Nox Intelligence."""

from fastapi import APIRouter

from nox_intelligence.models import NoxContext, NoxIntelligenceResult
from nox_intelligence.service import default_nox_service


router = APIRouter(prefix="/nox", tags=["nox"])


@router.post("/respond", response_model=NoxIntelligenceResult)
def respond_with_nox(context: NoxContext) -> NoxIntelligenceResult:
    return default_nox_service.respond(context)
