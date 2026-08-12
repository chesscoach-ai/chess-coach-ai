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
  };
  cache: {
    l1: string;
    l2: string;
  };
};
