import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteFooter from "@/components/Layout/SiteFooter";

export const metadata: Metadata = {
  title: "Chess Clan — Coach & Battles",
  description:
    "Joue gratuitement en ligne, rejoins un clan et progresse avec ton mentor d’échecs personnel.",
  manifest: "/manifest.webmanifest",
  applicationName: "Chess Clan",
  icons: {
    icon: [
      {
        url: "/brand/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/brand/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chess Clan",
  },
  formatDetection: {
    telephone: false,
  },
  robots:
    process.env.COMMERCIAL_LAUNCH_ENABLED ===
    "true"
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: false,
          nocache: true,
        },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030712",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
