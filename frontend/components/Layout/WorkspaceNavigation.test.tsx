import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkspaceMenu from "@/components/Layout/WorkspaceMenu";
import { MobileDock } from "@/components/Layout/ProductWorkspace";

const noop = () => undefined;

describe("navigation produit consolidée", () => {
  it("met le coach Nox au premier niveau de la navigation desktop", () => {
    const markup = renderToStaticMarkup(<WorkspaceMenu pillar="progress" onPlay={noop} onCoach={noop} onProgress={noop} onClan={noop} />);
    expect(markup).toContain("Jouer");
    expect(markup).toContain("Coach Nox");
    expect(markup).toContain("Progresser");
    expect(markup).toContain("Clan");
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("Mes parties");
  });

  it("offre les mêmes quatre portes dans la navigation mobile", () => {
    const markup = renderToStaticMarkup(<MobileDock pillar="clan" onPlay={noop} onCoach={noop} onProgress={noop} onClan={noop} />);
    expect(markup.match(/<button/g)).toHaveLength(4);
    expect(markup).toContain("Jouer");
    expect(markup).toContain("Coach");
    expect(markup).toContain("Progresser");
    expect(markup).toContain("Clan");
    expect(markup).toContain('aria-current="page"');
  });
});
