"use client";

import { useState } from "react";

type Orientation = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  orientation?: Orientation;
  closable?: boolean;
};

const POSITIONS: Record<Orientation, { tooltip: string; arrow: string }> = {
  top: {
    tooltip: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    arrow: "left-1/2 top-full -translate-x-1/2 border-t-ink",
  },
  bottom: {
    tooltip: "top-full left-1/2 -translate-x-1/2 mt-2",
    arrow: "left-1/2 bottom-full -translate-x-1/2 border-b-ink",
  },
  left: {
    tooltip: "right-full top-1/2 -translate-y-1/2 mr-2",
    arrow: "left-full top-1/2 -translate-y-1/2 border-l-ink",
  },
  right: {
    tooltip: "left-full top-1/2 -translate-y-1/2 ml-2",
    arrow: "right-full top-1/2 -translate-y-1/2 border-r-ink",
  },
};

export function Tooltip({
  label,
  children,
  defaultOpen = false,
  orientation = "top",
  closable = false,
}: TooltipProps) {
  const [dismissed, setDismissed] = useState(false);

  // forceVisible keeps the tooltip open on load until the user dismisses it
  const forceVisible = defaultOpen && !dismissed;

  const { tooltip, arrow } = POSITIONS[orientation];

  return (
    <div className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={[
          "absolute flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5",
          "text-xs font-medium text-white shadow-pill transition-opacity duration-150",
          "group-hover:opacity-100",
          tooltip,
          forceVisible ? "opacity-100" : "opacity-0",
          closable ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {label}
        {closable && (
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setDismissed(true)}
            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/20"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        )}
        <span className={`absolute border-4 border-transparent ${arrow}`} />
      </span>
    </div>
  );
}
