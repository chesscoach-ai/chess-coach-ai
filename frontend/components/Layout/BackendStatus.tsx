"use client";

import { useEffect, useState } from "react";
import { ApiService } from "@/services/api/ApiService";

type ConnectionStatus = "loading" | "online" | "offline";

export default function BackendStatus({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<ConnectionStatus>("loading");

  useEffect(() => {
    if (disabled) {
      return;
    }
    let isMounted = true;

    async function checkBackend(): Promise<void> {
      try {
        const response = await ApiService.getHealth();

        if (!isMounted) {
          return;
        }

        if (response.status === "healthy") {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch {
        if (isMounted) {
          setStatus("offline");
        }
      }
    }

    checkBackend();

    const intervalId = window.setInterval(() => {
      checkBackend();
    }, 10_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [disabled]);

  if (disabled) {
    return (
      <div className="mb-2 flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 sm:mb-4 sm:px-4 sm:py-2">
        <span
          className="h-2.5 w-2.5 rounded-full bg-gray-600"
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-gray-400 sm:text-sm">
            Aides d’analyse hors ligne — partie équitable
        </span>
      </div>
    );
  }

  const statusConfig = {
    loading: {
      label: "Connexion au moteur…",
      dotClassName: "bg-yellow-400",
      textClassName: "text-yellow-300",
    },
    online: {
      label: "Moteur d’analyse en ligne",
      dotClassName: "bg-green-400",
      textClassName: "text-green-300",
    },
    offline: {
      label: "Moteur d’analyse hors ligne",
      dotClassName: "bg-red-400",
      textClassName: "text-red-300",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="mb-2 flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 sm:mb-4 sm:px-4 sm:py-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${config.dotClassName}`}
        aria-hidden="true"
      />

      <span className={`text-xs font-medium sm:text-sm ${config.textClassName}`}>
        {config.label}
      </span>
    </div>
  );
}
