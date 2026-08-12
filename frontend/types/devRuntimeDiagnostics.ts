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
};
