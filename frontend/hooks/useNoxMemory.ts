"use client";

import { useCallback, useEffect, useState } from "react";

import type { NoxMemoryEnvelope } from "@/lib/nox/memoryTypes";

export function useNoxMemory() {
  const [memory, setMemory] = useState<NoxMemoryEnvelope | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nox/memory", { cache: "no-store" });
      if (response.ok) setMemory((await response.json()) as NoxMemoryEnvelope);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/nox/memory", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setMemory((await response.json()) as NoxMemoryEnvelope);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // La mémoire ne doit jamais bloquer une partie si le stockage est indisponible.
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const reset = useCallback(async () => {
    const response = await fetch("/api/nox/memory", { method: "DELETE" });
    if (response.ok) setMemory((await response.json()) as NoxMemoryEnvelope);
    return response.ok;
  }, []);

  return { memory, loading, refresh, reset };
}
