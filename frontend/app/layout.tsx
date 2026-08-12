import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteFooter from "@/components/Layout/SiteFooter";
import MobileRuntime from "@/components/Mobile/MobileRuntime";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.AUTH_URL?.startsWith("http")
      ? process.env.AUTH_URL
      : "http://localhost:3000",
  ),
  title: "Knightly — AI Chess Companion",
  description:
    "Joue aux échecs, comprends tes coups et progresse avec un accompagnement adapté à ton niveau.",
  manifest: "/manifest.webmanifest",
  applicationName: "Knightly",
  icons: {
    icon: [
      {
        url: "/brand/knightly-mark.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Knightly",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Knightly",
    title: "Knightly — AI Chess Companion",
    description:
      "Joue aux échecs, comprends tes coups et progresse à chaque partie.",
    images: [
      {
        url: "/brand/app-icon-512.png",
        width: 512,
        height: 512,
        alt: "Knightly — AI Chess Companion",
      },
    ],
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
        <MobileRuntime />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
