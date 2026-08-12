import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Knightly — AI Chess Companion",
    short_name: "Knightly",
    description:
      "Joue aux échecs, comprends tes coups et progresse avec un accompagnement adapté à ton niveau.",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    lang: "fr",
    orientation: "any",
    categories: ["games", "education", "sports"],
    icons: [
      {
        src: "/brand/knightly-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
