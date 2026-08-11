"""Erreurs de domaine du moteur, indépendantes de FastAPI."""

from pathlib import Path


class StockfishRuntimeError(RuntimeError):
    """Erreur racine traduite par les adaptateurs HTTP."""


class EngineUnavailableError(StockfishRuntimeError):
    def __init__(self, path: Path):
        self.path = path
        super().__init__(f"Stockfish binary is unavailable: {path}")


class EngineCrashedError(StockfishRuntimeError):
    """Le processus s'est arrêté pendant une opération."""


class QueueTimeoutError(StockfishRuntimeError):
    """Le moteur n'a pas pu etre acquis dans le delai imparti."""


class AnalysisTimeoutError(StockfishRuntimeError):
    """Le calcul ou le budget total a expire."""


class ServiceBusyError(StockfishRuntimeError):
    """La capacite active et la file bornee sont saturees."""


class AnalysisFailedError(StockfishRuntimeError):
    """python-chess a signalé une erreur moteur non récupérable localement."""


class InvalidPositionError(StockfishRuntimeError):
    """La FEN ne peut pas être interprétée."""


class FinishedPositionError(StockfishRuntimeError):
    """La position ne peut plus être analysée comme position jouable."""


class NoUsableVariationError(StockfishRuntimeError):
    """Le moteur n'a fourni aucune variante exploitable."""


class InvalidMoveError(StockfishRuntimeError):
    """Le coup demandé est mal formé ou illégal."""
