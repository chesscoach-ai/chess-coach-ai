import Image from "next/image";
import type { ReactNode } from "react";

export default function CoachMentorMessage({
  name = "Nox",
  eyebrow = "Compagnon Knightly",
  title,
  children,
  compact = false,
}: {
  name?: string;
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 text-center">
        <div
          className={[
            "relative overflow-hidden rounded-2xl border border-blue-700/70 bg-blue-950 shadow-[0_0_24px_rgba(37,99,235,0.2)]",
            compact
              ? "h-12 w-12"
              : "h-16 w-16 sm:h-20 sm:w-20",
          ].join(" ")}
        >
          <Image
            src="/brand/nox-squire.svg"
            alt={`${name}, coach chevalier`}
            fill
            sizes={compact ? "48px" : "80px"}
            className="object-cover"
          />
        </div>
        {!compact && (
          <p className="mt-1 max-w-20 truncate text-[10px] font-bold text-blue-300">
            {name}
          </p>
        )}
      </div>

      <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-blue-900/70 bg-gradient-to-br from-blue-950/45 to-gray-950/80 p-4">
        <span
          aria-hidden="true"
          className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-blue-900/70 bg-blue-950/80"
        />
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
          {eyebrow} · {name}
        </p>
        {title && (
          <p className="mt-1 text-base font-black text-white">
            {title}
          </p>
        )}
        <div className="mt-2 text-sm leading-6 text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}
