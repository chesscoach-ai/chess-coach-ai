"use client";

import { Capacitor } from "@capacitor/core";
import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from "@capacitor/haptics";
import { PushNotifications } from "@capacitor/push-notifications";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): "ios" | "android" | "web" {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : "web";
}

export async function playMoveHaptic(options: {
  capture?: boolean;
  check?: boolean;
  checkmate?: boolean;
}): Promise<void> {
  if (!isNativeApp()) return;

  try {
    if (options.checkmate) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (options.check) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else {
      await Haptics.impact({
        style: options.capture ? ImpactStyle.Medium : ImpactStyle.Light,
      });
    }
  } catch {
    // Le retour haptique reste un agrément : il ne bloque jamais le coup.
  }
}

export async function requestNativePushRegistration(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return false;
  await PushNotifications.register();
  return true;
}

export async function disableNativePushToken(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await fetch("/api/push/native", { method: "DELETE" });
    await PushNotifications.unregister();
  } catch {
    // La préférence locale reste prioritaire si le réseau est indisponible.
  }
}
