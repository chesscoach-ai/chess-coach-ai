"use client";

import type { BetaEventName } from "@/lib/beta/constants";
import { KNIGHTLY_BETA_VERSION } from "@/lib/beta/constants";

const VISITOR_KEY = "knightly:beta:visitor";
const FIRST_EVENT_PREFIX = "knightly:beta:first:";

export function getBetaVisitorId(): string {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const value = window.crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, value);
  return value;
}

export function getBetaPlatform(): string {
  const native = document.documentElement.dataset.nativeApp === "true";
  return native ? "android" : window.matchMedia("(max-width: 640px)").matches ? "mobile-web" : "web";
}

export function trackBetaEvent(eventName: BetaEventName): void {
  if (eventName.startsWith("first_")) {
    const key = `${FIRST_EVENT_PREFIX}${eventName}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, new Date().toISOString());
  }
  const body = JSON.stringify({
    eventName,
    visitorId: getBetaVisitorId(),
    page: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    platform: getBetaPlatform(),
    version: KNIGHTLY_BETA_VERSION,
  });
  void fetch("/api/beta/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function betaTechnicalContext() {
  return {
    visitorId: getBetaVisitorId(),
    page: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    platform: getBetaPlatform(),
    browser: navigator.userAgent.slice(0, 300),
    version: KNIGHTLY_BETA_VERSION,
    appState: document.visibilityState,
  };
}
