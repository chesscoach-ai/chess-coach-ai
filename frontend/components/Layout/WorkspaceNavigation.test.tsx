import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkspaceMenu from "@/components/Layout/WorkspaceMenu";
import { MobileDock } from "@/components/Layout/ProductWorkspace";

const noop = () => undefined;

describe("navigation produit consolidée", () => {
  it("limite la navigation desktop aux trois portes", () => {
    const markup = renderToStaticMarkup(<WorkspaceMenu pillar="progress" onPlay={noop} onProgress={noop} onClan={noop} />);
    expect(markup).toContain("Jouer");
    expect(markup).toContain("Progresser");
    expect(markup).toContain("Clan");
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("Nox — Analyse");
    expect(markup).not.toContain("Mes parties");
  });

  it("offre les mêmes trois portes dans la navigation mobile", () => {
    const markup = renderToStaticMarkup(<MobileDock pillar="clan" onPlay={noop} onProgress={noop} onClan={noop} />);
    expect(markup.match(/<button/g)).toHaveLength(3);
    expect(markup).toContain("Jouer");
    expect(markup).toContain("Progresser");
    expect(markup).toContain("Clan");
    expect(markup).toContain('aria-current="page"');
  });
});
