"use client";

import type { PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { PushNotifications } from "@capacitor/push-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getNativePlatform, isNativeApp } from "@/lib/mobile/platform";
import { resolveMobileRoute } from "@/lib/mobile/deepLinks";

export default function MobileRuntime() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.dataset.nativeApp = "true";
    const handles: PluginListenerHandle[] = [];
    let disposed = false;

    const keep = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) {
        await handle.remove();
      } else {
        handles.push(handle);
      }
    };

    const openRoute = (url: string) => {
      const route = resolveMobileRoute(url);
      if (route) router.push(route);
    };

    const setup = async () => {
      await Promise.allSettled([
        StatusBar.setStyle({ style: Style.Light }),
        StatusBar.setBackgroundColor({ color: "#030712" }),
        SplashScreen.hide(),
      ]);

      const network = await Network.getStatus();
      if (!disposed) setIsOffline(!network.connected);

      await keep(
        Network.addListener("networkStatusChange", (status) => {
          setIsOffline(!status.connected);
          if (status.connected) {
            window.dispatchEvent(new Event("chess-clan:network-restored"));
          }
        }),
      );
      await keep(
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            window.dispatchEvent(new Event("chess-clan:resume"));
          }
        }),
      );
      await keep(App.addListener("appUrlOpen", ({ url }) => openRoute(url)));
      await keep(
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else void App.minimizeApp();
        }),
      );
      await keep(
        PushNotifications.addListener("registration", ({ value }) => {
          void fetch("/api/push/native", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: value,
              platform: getNativePlatform(),
            }),
          });
        }),
      );
      await keep(
        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          ({ notification }) => {
            const route = notification.data?.url;
            if (typeof route === "string") openRoute(route);
          },
        ),
      );

      const permission = await PushNotifications.checkPermissions();
      if (permission.receive === "granted") {
        await PushNotifications.register();
      }
    };

    void setup();
    return () => {
      disposed = true;
      delete document.documentElement.dataset.nativeApp;
      for (const handle of handles) void handle.remove();
    };
  }, [router]);

  if (!isOffline) return null;
  return (
    <div
      role="status"
      className="native-offline-banner fixed inset-x-3 top-3 z-[100] rounded-xl border border-amber-700 bg-amber-950/95 px-4 py-3 text-center text-sm font-bold text-amber-100 shadow-2xl"
    >
      Connexion perdue — la partie reprendra dès que le royaume retrouvera du réseau.
    </div>
  );
}
