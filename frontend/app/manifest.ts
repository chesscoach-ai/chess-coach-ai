import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chess Clan — Coach & Battles",
    short_name: "Chess Clan",
    description:
      "Joue gratuitement en ligne, rejoins un clan et progresse avec ton coach d’échecs personnel.",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    lang: "fr",
    orientation: "any",
    categories: ["games", "education", "sports"],
    icons: [
      {
        src: "/brand/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
