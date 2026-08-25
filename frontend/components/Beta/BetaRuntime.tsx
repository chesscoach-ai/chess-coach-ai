"use client";

import { useEffect } from "react";

import { trackBetaEvent } from "@/lib/beta/client";

export default function BetaRuntime() {
  useEffect(() => {
    if (!window.sessionStorage.getItem("knightly:beta:opened")) {
      window.sessionStorage.setItem("knightly:beta:opened", "1");
      trackBetaEvent("app_opened");
    }
    const reportError = () => trackBetaEvent("frontend_error");
    window.addEventListener("error", reportError);
    window.addEventListener("unhandledrejection", reportError);
    return () => {
      window.removeEventListener("error", reportError);
      window.removeEventListener("unhandledrejection", reportError);
    };
  }, []);
  return null;
}
