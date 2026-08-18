import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import NoxShell from "@/components/Nox/NoxShell";

describe("NoxShell", () => {
  it("affiche Nox Écuyer et le champ conversationnel", () => {
    const markup = renderToStaticMarkup(
      <NoxShell
        context={{
          contextKey: "empty",
          mode: "analysis",
        }}
      />,
    );

    expect(markup).toContain("Nox");
    expect(markup).toContain("Écuyer");
    expect(markup).toContain("data-state=\"idle\"");
    expect(markup).toContain("Demande à Nox");
    expect(markup).toContain("Parler à Nox");
    expect(markup).toContain("data-source=\"deterministic\"");
  });

  it("rend le shell mobile compact sans masquer son texte accessible", () => {
    const markup = renderToStaticMarkup(
      <NoxShell
        context={{
          contextKey: "thinking",
          mode: "analysis",
          isThinking: true,
        }}
      />,
    );

    expect(markup).toContain("Parler à Nox");
    expect(markup).toContain("Nox, jeune écuyer et compagnon d’échecs");
    expect(markup).toContain("data-state=\"thinking\"");
    expect(markup).toContain("aria-live=\"polite\"");
    expect(markup).toContain("sm:block");
  });

  it("peut masquer les actions dans un exercice", () => {
    const markup = renderToStaticMarkup(
      <NoxShell
        context={{
          contextKey: "exercise",
          mode: "exercise",
          exerciseStatus: "correct",
        }}
        showQuickActions={false}
      />,
    );

    expect(markup).toContain("data-state=\"success\"");
    expect(markup).not.toContain("Pourquoi ce coup ?");
  });

  it("affiche discrètement le rang et la progression pédagogique", () => {
    const markup = renderToStaticMarkup(<NoxShell context={{ contextKey: "rank", mode: "analysis", progression: {
      rank: "young-knight", rankLabel: "Jeune Chevalier", nextRank: "knight", nextRankLabel: "Chevalier",
      growthScore: 52, progressPercent: 31, sources: [], remaining: [], conceptsObserved: [], eventsCounted: 4,
      eventsIgnored: 0, lastRankChange: null, milestones: [], persistent: true, recentlyEvolved: false, preview: false,
    } }} />);
    expect(markup).toContain("Jeune Chevalier");
    expect(markup).toContain("31% vers Chevalier");
    expect(markup).toContain("Progression de Nox : 31 %");
  });

  it("n’appelle aucun service OpenAI ou endpoint distant", () => {
    const source = readFileSync(
      new URL("./NoxShell.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("NoxService");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("OPENAI");
  });
});
