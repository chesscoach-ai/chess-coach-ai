export type BetaDiagnostics = {
  storage: "postgresql" | "local-json";
  events: Record<string, number>;
  visitors: number;
  feedback: number;
  bugs: number;
  retentionJ1: number | null;
  retentionJ7: number | null;
};
