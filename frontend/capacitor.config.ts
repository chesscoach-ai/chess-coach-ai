import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.chessclan.app",
  appName: "Chess Clan",
  webDir: "mobile-shell",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
          allowNavigation: [new URL(serverUrl).hostname],
        },
      }
    : {}),
  android: {
    backgroundColor: "#030712",
  },
  ios: {
    backgroundColor: "#030712",
    contentInset: "automatic",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 900,
      backgroundColor: "#030712",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#030712",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
