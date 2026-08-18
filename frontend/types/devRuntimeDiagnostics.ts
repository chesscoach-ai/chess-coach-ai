export type DevRuntimeDiagnosticPayload = {
  collectedAt: string;
  frontend: {
    status: string;
    environment: string;
  };
  backend: {
    status: string;
    httpStatus: number | null;
  };
  stockfish: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  database: {
    status: string;
    type: string;
    urlDetected: boolean;
    migrationStatus: string;
    currentVersion: string | null;
    headVersion: string | null;
    cacheTablePresent: boolean | null;
  };
  cache: Record<string, unknown> | null;
  noxAi: Record<string, unknown> | null;
  noxMemory: {
    profiles: number;
    learningEvents: number;
    conceptsTracked: number;
    strengths: number;
    weaknesses: number;
    milestones: number;
    persistence: "postgresql" | "local-json";
  };
  noxProgression: {
    rank: string;
    growthScore: number;
    progressPercent: number;
    sources: string[];
    lastRankChange: string | null;
    eventsCounted: number;
    eventsIgnored: number;
  };
  noxMission: {
    active: string;
    concept: string;
    reason: string;
    difficulty: string;
    exercises: number;
    progress: string;
    status: string;
    eventsProduced: number;
    eventsIgnored: number;
    nextEligibility: string;
  };
};
