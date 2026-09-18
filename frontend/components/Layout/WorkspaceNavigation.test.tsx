import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkspaceMenu from "@/components/Layout/WorkspaceMenu";
import { MobileDock } from "@/components/Layout/ProductWorkspace";

const noop = () => undefined;

describe("navigation produit consolidée", () => {
  it("conserve trois piliers et rend l’analyse Nox accessible à part", () => {
    const markup = renderToStaticMarkup(<WorkspaceMenu pillar="progress" onPlay={noop} onCoach={noop} onProgress={noop} onClan={noop} />);
    expect(markup).toContain("Jouer");
    expect(markup).toContain("Analyser avec Nox");
    expect(markup).toContain("Progresser");
    expect(markup).toContain("Clan");
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("Mes parties");
  });

  it("offre trois piliers mobiles et une action Nox secondaire", () => {
    const markup = renderToStaticMarkup(<MobileDock pillar="clan" onPlay={noop} onCoach={noop} onProgress={noop} onClan={noop} />);
    expect(markup.match(/<button/g)).toHaveLength(4);
    expect(markup).toContain("Jouer");
    expect(markup).toContain("Analyser avec Nox");
    expect(markup).toContain("Progresser");
    expect(markup).toContain("Clan");
    expect(markup).toContain('aria-current="page"');
  });
});
