"use client";

import { useState, useEffect } from "react";

type Orientation =
  | "top" | "bottom" | "left" | "right"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right";

type TooltipProps = {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  orientation?: Orientation;
  closable?: boolean;
};

// Each orientation animates only on its own axis so it doesn't
// conflict with the -translate-x-1/2 / -translate-y-1/2 used for centering.
const POSITIONS: Record<
  Orientation,
  { tooltip: string; arrow: string; hidden: string; visible: string; hoverVisible: string }
> = {
  top: {
    tooltip: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    arrow: "left-1/2 top-full -translate-x-1/2 border-t-ink",
    hidden: "translate-y-3",
    visible: "translate-y-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-y-0",
  },
  bottom: {
    tooltip: "top-full left-1/2 -translate-x-1/2 mt-2",
    arrow: "left-1/2 bottom-full -translate-x-1/2 border-b-ink",
    hidden: "-translate-y-3",
    visible: "translate-y-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-y-0",
  },
  left: {
    tooltip: "right-full top-1/2 -translate-y-1/2 mr-2",
    arrow: "left-full top-1/2 -translate-y-1/2 border-l-ink",
    hidden: "translate-x-3",
    visible: "translate-x-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-x-0",
  },
  right: {
    tooltip: "left-full top-1/2 -translate-y-1/2 ml-2",
    arrow: "right-full top-1/2 -translate-y-1/2 border-r-ink",
    hidden: "-translate-x-3",
    visible: "translate-x-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-x-0",
  },
  // Diagonal — anchored to an edge so the tooltip expands away from the screen boundary
  "top-left": {
    tooltip: "bottom-full right-0 mb-2",
    arrow: "right-3 top-full border-t-ink",
    hidden: "translate-y-3",
    visible: "translate-y-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-y-0",
  },
  "top-right": {
    tooltip: "bottom-full left-0 mb-2",
    arrow: "left-3 top-full border-t-ink",
    hidden: "translate-y-3",
    visible: "translate-y-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-y-0",
  },
  "bottom-left": {
    tooltip: "top-full right-0 mt-2",
    arrow: "right-3 bottom-full border-b-ink",
    hidden: "-translate-y-3",
    visible: "translate-y-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-y-0",
  },
  "bottom-right": {
    tooltip: "top-full left-0 mt-2",
    arrow: "left-3 bottom-full border-b-ink",
    hidden: "-translate-y-3",
    visible: "translate-y-0",
    hoverVisible: "group-hover:opacity-100 group-hover:translate-y-0",
  },
};

export function Tooltip({
  label,
  children,
  defaultOpen = false,
  orientation = "top",
  closable = false,
}: TooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (defaultOpen) setMounted(true);
  }, [defaultOpen]);

  const forceVisible = defaultOpen && mounted && !dismissed;
  const { tooltip, arrow, hidden, visible, hoverVisible } = POSITIONS[orientation];

  return (
    <div className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={[
          "absolute flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5",
          "text-xs font-medium text-white shadow-pill",
          "transition-all duration-300 ease-out",
          !dismissed && hoverVisible,
          tooltip,
          forceVisible ? `opacity-100 ${visible}` : `opacity-0 ${hidden}`,
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
