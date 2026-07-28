import {
  buildPedagogicalDiagnostic,
  type DiagnosticInput,
} from "@/lib/diagnostics/diagnosticRules";
import type { PedagogicalDiagnostic } from "@/types/pedagogicalDiagnostic";

export function buildDiagnostics(
  moves: DiagnosticInput[],
  minimumLossCp = 50,
): PedagogicalDiagnostic[] {
  return moves
    .filter(
      (move) =>
        move.evaluationLossCp >=
        minimumLossCp,
    )
    .map(buildPedagogicalDiagnostic)
    .sort(
      (a, b) =>
        b.evaluationLossCp -
        a.evaluationLossCp,
    );
}

export function getDiagnosticSummary(
  diagnostics: PedagogicalDiagnostic[],
) {
  const themeCounts =
    diagnostics.reduce<
      Record<string, number>
    >((accumulator, diagnostic) => {
      accumulator[
        diagnostic.primaryTheme
      ] =
        (accumulator[
          diagnostic.primaryTheme
        ] ?? 0) + 1;

      return accumulator;
    }, {});

  const primaryWeakness =
    Object.entries(themeCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? null;

  const averageLossCp =
    diagnostics.length === 0
      ? 0
      : Math.round(
          diagnostics.reduce(
            (sum, diagnostic) =>
              sum +
              diagnostic.evaluationLossCp,
            0,
          ) / diagnostics.length,
        );

  return {
    total: diagnostics.length,
    blunders: diagnostics.filter(
      (item) =>
        item.severity === "blunder",
    ).length,
    mistakes: diagnostics.filter(
      (item) =>
        item.severity === "mistake",
    ).length,
    inaccuracies: diagnostics.filter(
      (item) =>
        item.severity ===
        "inaccuracy",
    ).length,
    primaryWeakness,
    averageLossCp,
    themeCounts,
  };
}
