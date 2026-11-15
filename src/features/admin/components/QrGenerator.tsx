"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";

import type { PetEntrySummary } from "@/lib/repository";
import { useSnackbar } from "@/ui/Snackbar";

import { reserveId, type ReserveIdResult } from "../actions";
import {
  countByStatus,
  FILTER_LABELS,
  filterAfterReserve,
  filterByStatus,
  STATUS_FILTERS,
  type StatusFilter,
} from "../entries";
import { DEFAULT_QR_STYLE, type QrStyle } from "../qr-style";
import { outlineButton } from "../styles";
import { PetQrCard } from "./PetQrCard";
import { Switch } from "./Switch";

type ErrorCode = Extract<ReserveIdResult, { status: "error" }>["message"];

const ERRORS: Record<ErrorCode, string> = {
  unauthorized: "Not authorized.",
  generation_failed: "Could not reserve a free id. Try again.",
};

/** QR codes rendered per page; each one is computed when its card mounts. */
const PAGE_SIZE = 24;

type QrGeneratorProps = {
  /** Every id in the database, newest first. */
  initialEntries: PetEntrySummary;
  /** URL prefix printed in the QR codes (already validated by the page). */
  qrBase: string;
};

export function QrGenerator({ initialEntries, qrBase }: QrGeneratorProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [qrStyle, setQrStyle] = useState<QrStyle>(DEFAULT_QR_STYLE);
  // The cards redraw their codes from this. Deferred, so a switch flips at once
  // and the (interruptible) redraw of every visible card follows it.
  const cardStyle = useDeferredValue(qrStyle);
  const [pending, startTransition] = useTransition();
  const { show } = useSnackbar();

  const counts = useMemo(() => countByStatus(entries), [entries]);
  const filtered = useMemo(() => filterByStatus(entries, filter), [entries, filter]);

  function handleFilter(next: StatusFilter) {
    setFilter(next);
    setVisible(PAGE_SIZE);
  }

  function handleReserve() {
    startTransition(async () => {
      try {
        const result = await reserveId();
        if (result.status === "success") {
          setEntries((prev) => [result.entry, ...prev]);
          setFilter(filterAfterReserve);
          show(`Reserved ${result.entry.id}`, { variant: "info" });
        } else {
          show(ERRORS[result.message], { variant: "error" });
        }
      } catch (error) {
        console.error("[admin] reserveId failed", error);
        show("Something went wrong.", { variant: "error" });
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => handleFilter(option)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold " +
                (filter === option
                  ? "border-ink bg-ink text-white"
                  : "border-black/20 text-ink hover:bg-black/5")
              }
            >
              {FILTER_LABELS[option]} ({counts[option]})
            </button>
          ))}
        </div>
        <div role="group" aria-label="QR code style" className="flex flex-wrap gap-x-6 gap-y-2">
          <Switch
            label="Logo in the middle"
            checked={qrStyle.logo}
            onChange={(logo) => setQrStyle((prev) => ({ ...prev, logo }))}
          />
          <Switch
            label="Round dots"
            checked={qrStyle.dots}
            onChange={(dots) => setQrStyle((prev) => ({ ...prev, dots }))}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {entries.length === 0
            ? "No QR codes yet. Use the button at the bottom right."
            : "No ids with this status."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-wrap gap-4">
          {filtered.slice(0, visible).map((entry) => (
            <li key={entry.id} className="w-72">
              <PetQrCard entry={entry} qrBase={qrBase} qrStyle={cardStyle} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > visible ? (
        <button
          type="button"
          onClick={() => setVisible((prev) => prev + PAGE_SIZE)}
          className={`mt-6 rounded-lg px-4 py-2 text-sm ${outlineButton}`}
        >
          Load more ({filtered.length - visible} left)
        </button>
      ) : null}

      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleReserve}
          disabled={pending}
          className="rounded-full bg-ink bg-[url(/noise-light.png)] px-6 py-4 font-semibold text-white shadow-lg hover:bg-ink/90 disabled:opacity-60"
        >
          {pending ? "Reserving…" : "Generate new QR code"}
        </button>
      </div>
    </>
  );
}
