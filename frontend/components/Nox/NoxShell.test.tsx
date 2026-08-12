import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import NoxShell from "@/components/Nox/NoxShell";

describe("NoxShell", () => {
  it("affiche Nox Écuyer et les boutons conversationnels", () => {
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
    expect(markup).toContain("Pourquoi ce coup ?");
    expect(markup).toContain("Quel est mon plan ?");
    expect(markup).toContain("Qu’est-ce que j’ai raté ?");
    expect(markup).toContain("Montre-moi");
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

    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain("Nox, jeune écuyer et compagnon d’échecs");
    expect(markup).toContain("data-state=\"thinking\"");
    expect(markup).toContain("aria-live=\"polite\"");
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
});
