import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisApiError,
  ApiService,
  type PositionAnalysisResponse,
} from "./ApiService";
import { scheduleAnalysis } from "./analysisScheduler";

const SAMPLE_ANALYSIS = {
  best_move: "e2e4",
  best_move_san: "e4",
  top_moves: [],
} as unknown as PositionAnalysisResponse;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ApiService analyse", () => {
  it("parse une analyse réussie et utilise l'endpoint central", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE_ANALYSIS));
    vi.stubGlobal("fetch", fetchMock);

    const result = await ApiService.analysePosition({ fen: "fen", depth: 12 });

    expect(result.best_move).toBe("e2e4");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analysis-engine/analysis");
  });

  it.each([
    [400, "La position ne peut pas être analysée."],
    [503, "L’analyse est très sollicitée. Réessaie dans quelques secondes."],
    [504, "Cette position demande plus de temps que prévu."],
  ])("traduit l'erreur HTTP %s après une nouvelle tentative", async (status, expectedMessage) => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ detail: "FastAPI raw" }, status),
    );
    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    await expect(
      ApiService.analysePosition({ fen: "fen" }),
    ).rejects.toMatchObject({
      message: expectedMessage,
      status,
      technicalDetail: "FastAPI raw",
    });
    expect(fetchMock).toHaveBeenCalledTimes(status === 503 ? 2 : 1);
  });

  it("traduit une erreur réseau sans exposer le détail technique", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));

    await expect(ApiService.analysePosition({ fen: "fen" })).rejects.toMatchObject({
      message:
        "Le moteur d’analyse ne répond pas. Vérifie ta connexion puis réessaie.",
      kind: "network",
      technicalDetail: "ECONNRESET",
    });
  });

  it("annule la requête périmée lors d'un changement rapide de FEN", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
        if (fetchMock.mock.calls.length === 2) {
          resolve(jsonResponse(SAMPLE_ANALYSIS));
        }
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const firstController = new AbortController();
    const stale = ApiService.analysePosition(
      { fen: "old-fen" },
      { signal: firstController.signal },
    );
    firstController.abort();
    const fresh = ApiService.analysePosition({ fen: "new-fen" });

    await expect(stale).rejects.toBeInstanceOf(AnalysisApiError);
    await expect(fresh).resolves.toMatchObject({ best_move: "e2e4" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fait converger exercices, move-review et adversaire IA", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ played_move: "e2e4" }))
      .mockResolvedValueOnce(jsonResponse({ best_move: "e2e4", moves: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          move: { from: "e7", to: "e5", san: "e5", promotion: null },
          opponent: "Club",
          estimatedElo: 1200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await ApiService.reviewMove({ fen_before: "fen", played_move: "e2e4" });
    await ApiService.analyseExercise("fen");
    await ApiService.requestAiMove({
      fen: "fen",
      levelId: "club",
      personaId: "balanced",
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "/api/analysis-engine/move-review",
      "/api/exercise-engine",
      "/api/ai-move",
    ]);
  });
});

describe("auto-analyse", () => {
  it("évite les appels intermédiaires lors d'une rafale de positions", async () => {
    vi.useFakeTimers();
    const execute = vi.fn();
    const avoided = vi.fn();
    const cancellations = Array.from({ length: 5 }, () =>
      scheduleAnalysis(execute, 180, avoided),
    );
    cancellations.slice(0, -1).forEach((cancel) => cancel());

    await vi.advanceTimersByTimeAsync(180);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(avoided).toHaveBeenCalledTimes(4);
  });
});

describe("absence de fetch direct dans les consommateurs migrés", () => {
  it.each([
    "components/Analysis/AnalysisPanel.tsx",
    "hooks/analysis/useMoveReviews.ts",
    "hooks/useAiOpponent.ts",
    "lib/api/exerciseAnalysis.ts",
  ])("%s passe par ApiService", async (relativePath) => {
    const source = await readFile(path.join(process.cwd(), relativePath), "utf8");
    expect(source).not.toContain("fetch(");
  });
});
