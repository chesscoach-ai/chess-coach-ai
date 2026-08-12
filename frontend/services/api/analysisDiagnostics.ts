export type AnalysisRequestState =
  | "idle"
  | "queued"
  | "calculating"
  | "ready"
  | "unavailable"
  | "error";

export type FrontendAnalysisDiagnostic = {
  endpoint: string;
  state: AnalysisRequestState;
  durationMs: number | null;
  httpStatus: number | null;
  recentErrors: number;
  totalRequests: number;
  cancelledRequests: number;
  debounceAvoided: number;
  errorTimestamps: string[];
  updatedAt: string;
};

const STORAGE_KEY = "knightly:dev:analysis-diagnostic";
const EMPTY_DIAGNOSTIC: FrontendAnalysisDiagnostic = {
  endpoint: "—",
  state: "idle",
  durationMs: null,
  httpStatus: null,
  recentErrors: 0,
  totalRequests: 0,
  cancelledRequests: 0,
  debounceAvoided: 0,
  errorTimestamps: [],
  updatedAt: new Date(0).toISOString(),
};

let memoryDiagnostic = { ...EMPTY_DIAGNOSTIC };

function persist(value: FrontendAnalysisDiagnostic): void {
  memoryDiagnostic = value;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Le diagnostic ne doit jamais gêner l'analyse.
  }
}

export function readFrontendAnalysisDiagnostic(): FrontendAnalysisDiagnostic {
  let diagnostic = memoryDiagnostic;
  try {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        diagnostic = {
          ...EMPTY_DIAGNOSTIC,
          ...(JSON.parse(stored) as Partial<FrontendAnalysisDiagnostic>),
        };
      }
    }
  } catch {
    // Repli mémoire si le stockage navigateur est indisponible.
  }
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const errorTimestamps = diagnostic.errorTimestamps.filter(
    (timestamp) => new Date(timestamp).getTime() >= oneHourAgo,
  );
  return {
    ...diagnostic,
    errorTimestamps,
    recentErrors: errorTimestamps.length,
  };
}

export function recordAnalysisQueued(endpoint: string): void {
  const current = readFrontendAnalysisDiagnostic();
  persist({
    ...current,
    endpoint,
    state: "queued",
    durationMs: null,
    httpStatus: null,
    updatedAt: new Date().toISOString(),
  });
}

export function recordAnalysisDebounced(): void {
  const current = readFrontendAnalysisDiagnostic();
  persist({
    ...current,
    debounceAvoided: current.debounceAvoided + 1,
    updatedAt: new Date().toISOString(),
  });
}

export function recordAnalysisStarted(endpoint: string): number {
  const current = readFrontendAnalysisDiagnostic();
  persist({
    ...current,
    endpoint,
    state: "calculating",
    durationMs: null,
    httpStatus: null,
    totalRequests: current.totalRequests + 1,
    updatedAt: new Date().toISOString(),
  });
  return performance.now();
}

export function recordAnalysisFinished(input: {
  endpoint: string;
  state: AnalysisRequestState;
  startedAt: number;
  httpStatus: number | null;
  cancelled?: boolean;
  error?: boolean;
}): void {
  const current = readFrontendAnalysisDiagnostic();
  const errorTimestamps = input.error
    ? [...current.errorTimestamps, new Date().toISOString()]
    : current.errorTimestamps;
  persist({
    ...current,
    endpoint: input.endpoint,
    state: input.state,
    durationMs: Math.max(0, Math.round(performance.now() - input.startedAt)),
    httpStatus: input.httpStatus,
    recentErrors: errorTimestamps.length,
    errorTimestamps,
    cancelledRequests:
      current.cancelledRequests + (input.cancelled ? 1 : 0),
    updatedAt: new Date().toISOString(),
  });
}
