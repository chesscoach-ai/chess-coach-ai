"""Traduction stable des erreurs de domaine vers les contrats HTTP actuels."""

from typing import NoReturn

from fastapi import HTTPException

from stockfish_runtime.errors import (
    AnalysisFailedError,
    AnalysisTimeoutError,
    EngineCrashedError,
    EngineUnavailableError,
    FinishedPositionError,
    InvalidMoveError,
    InvalidPositionError,
    NoUsableVariationError,
    QueueTimeoutError,
    ServiceBusyError,
)


def raise_position_http_error(error: Exception) -> NoReturn:
    if isinstance(error, ServiceBusyError):
        raise HTTPException(
            status_code=503,
            detail="Le service d'analyse est momentanément saturé.",
        ) from error
    if isinstance(error, QueueTimeoutError):
        raise HTTPException(
            status_code=504,
            detail="Le délai d'attente du moteur Stockfish est dépassé.",
        ) from error
    if isinstance(error, AnalysisTimeoutError):
        raise HTTPException(
            status_code=504,
            detail="Le délai d'analyse Stockfish est dépassé.",
        ) from error
    if isinstance(error, EngineUnavailableError):
        raise HTTPException(
            status_code=503,
            detail=f"Stockfish introuvable : {error.path}",
        ) from error
    if isinstance(error, InvalidPositionError):
        raise HTTPException(status_code=400, detail="FEN invalide.") from error
    if isinstance(error, FinishedPositionError):
        raise HTTPException(
            status_code=400,
            detail="La partie est terminée.",
        ) from error
    if isinstance(error, EngineCrashedError):
        raise HTTPException(
            status_code=503,
            detail="Stockfish s’est arrêté de manière inattendue.",
        ) from error
    if isinstance(error, NoUsableVariationError):
        details = {
            "no_variation": "Stockfish n’a renvoyé aucune variante exploitable.",
            "best_evaluation_unavailable": (
                "L’évaluation du meilleur coup est indisponible."
            ),
            "no_usable_move": "Stockfish n’a renvoyé aucun coup exploitable.",
        }
        raise HTTPException(
            status_code=500,
            detail=details.get(str(error), "Analyse Stockfish inexploitable."),
        ) from error
    if isinstance(error, AnalysisFailedError):
        details = {
            "evaluation_unavailable": "L’évaluation Stockfish est indisponible.",
            "evaluation_not_comparable": (
                "Impossible de comparer les évaluations Stockfish."
            ),
        }
        raise HTTPException(
            status_code=500,
            detail=details.get(
                str(error),
                f"Erreur du moteur Stockfish : {error}",
            ),
        ) from error
    raise error


def raise_move_review_http_error(error: Exception) -> NoReturn:
    if isinstance(error, ServiceBusyError):
        raise HTTPException(
            status_code=503,
            detail="Le service d'analyse est momentanément saturé.",
        ) from error
    if isinstance(error, QueueTimeoutError):
        raise HTTPException(
            status_code=504,
            detail="Le délai d'attente du moteur Stockfish est dépassé.",
        ) from error
    if isinstance(error, AnalysisTimeoutError):
        raise HTTPException(
            status_code=504,
            detail="Le délai d'analyse Stockfish est dépassé.",
        ) from error
    if isinstance(error, EngineUnavailableError):
        raise HTTPException(
            status_code=503,
            detail=f"Stockfish introuvable : {error.path}",
        ) from error
    if isinstance(error, InvalidPositionError):
        raise HTTPException(
            status_code=400,
            detail="Le FEN précédant le coup est invalide.",
        ) from error
    if isinstance(error, FinishedPositionError):
        raise HTTPException(
            status_code=400,
            detail="La partie était déjà terminée avant ce coup.",
        ) from error
    if isinstance(error, InvalidMoveError):
        detail = (
            "Le coup joué n’est pas au format UCI."
            if str(error) == "invalid_uci"
            else "Le coup joué n’est pas légal dans cette position."
        )
        raise HTTPException(status_code=400, detail=detail) from error
    if isinstance(error, EngineCrashedError):
        raise HTTPException(
            status_code=503,
            detail="Stockfish s’est arrêté de manière inattendue.",
        ) from error
    if isinstance(error, NoUsableVariationError):
        details = {
            "review_no_best_move": (
                "Stockfish n’a pas renvoyé de meilleur coup exploitable."
            ),
            "review_invalid_best_move": (
                "Le meilleur coup renvoyé par Stockfish est invalide."
            ),
            "review_after_unavailable": (
                "Stockfish n’a pas pu évaluer la position après le coup."
            ),
        }
        raise HTTPException(
            status_code=500,
            detail=details.get(str(error), "Analyse du coup inexploitable."),
        ) from error
    if isinstance(error, AnalysisFailedError):
        details = {
            "evaluation_unavailable": "L’évaluation Stockfish est indisponible.",
            "evaluation_not_comparable": (
                "Impossible de comparer les évaluations Stockfish."
            ),
        }
        raise HTTPException(
            status_code=500,
            detail=details.get(
                str(error),
                f"Erreur du moteur Stockfish : {error}",
            ),
        ) from error
    raise error
