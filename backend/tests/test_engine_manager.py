import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock

import chess.engine

from stockfish_runtime.engine_manager import EngineManager
from stockfish_runtime.engine_manager import default_engine_manager
from stockfish_runtime.errors import EngineUnavailableError


class EngineManagerUnitTests(unittest.TestCase):
    def test_unavailable_binary_has_an_explicit_state_and_error(self) -> None:
        manager = EngineManager(Path("missing-stockfish"))

        self.assertEqual(manager.state, "unavailable")
        with self.assertRaises(EngineUnavailableError):
            manager.get_engine()

    def test_start_configures_and_shutdown_closes_the_owned_engine(self) -> None:
        with TemporaryDirectory() as directory:
            binary = Path(directory) / "stockfish"
            binary.touch()
            engine = Mock()
            manager = EngineManager(
                binary,
                hash_mb=32,
                threads=1,
                engine_factory=Mock(return_value=engine),
            )

            started = manager.get_engine()

            self.assertIs(started, engine)
            self.assertEqual(manager.state, "ready")
            engine.configure.assert_called_once_with({"Hash": 32, "Threads": 1})

            manager.shutdown()

            engine.quit.assert_called_once_with()
            self.assertEqual(manager.state, "ready")
            self.assertIsNone(manager.engine)

    def test_terminated_session_is_discarded_and_next_call_restarts(self) -> None:
        with TemporaryDirectory() as directory:
            binary = Path(directory) / "stockfish"
            binary.touch()
            terminated_engine = Mock()
            restarted_engine = Mock()
            factory = Mock(side_effect=[terminated_engine, restarted_engine])
            manager = EngineManager(binary, engine_factory=factory)

            with self.assertRaises(chess.engine.EngineTerminatedError):
                with manager.session():
                    raise chess.engine.EngineTerminatedError(
                        "engine process died",
                    )

            self.assertIsNone(manager.engine)
            self.assertEqual(manager.state, "engine_crashed")
            self.assertIs(manager.get_engine(), restarted_engine)
            self.assertEqual(factory.call_count, 2)


@unittest.skipUnless(
    default_engine_manager.path.exists(),
    "Le binaire Stockfish de référence n'est pas disponible.",
)
class RealEngineManagerTests(unittest.TestCase):
    def tearDown(self) -> None:
        default_engine_manager.shutdown()

    def test_default_manager_starts_and_stops_the_real_engine(self) -> None:
        default_engine_manager.shutdown()

        engine = default_engine_manager.get_engine()
        self.assertIsNotNone(engine)

        default_engine_manager.shutdown()
        self.assertIsNone(default_engine_manager.engine)


if __name__ == "__main__":
    unittest.main()
