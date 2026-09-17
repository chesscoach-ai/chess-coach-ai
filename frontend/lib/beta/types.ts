export type BetaDiagnostics = {
  storage: "postgresql" | "local-json";
  events: Record<string, number>;
  visitors: number;
  feedback: number;
  bugs: number;
  retentionJ1: number | null;
  retentionJ3: number | null;
  retentionJ7: number | null;
  cohorts: Array<{ label: string; visitors: number; d1: number | null; d3: number | null; d7: number | null }>;
};
