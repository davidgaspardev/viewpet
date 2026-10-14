"use client";

import { useMemo, useState, useTransition } from "react";

import type { PetEntrySummary } from "@/lib/repository";
import { useSnackbar } from "@/ui/Snackbar";

import { reserveId, type ReserveIdResult } from "../actions";
import { countByStatus, filterByStatus, STATUS_FILTERS, type StatusFilter } from "../entries";
import { PetQrCard } from "./PetQrCard";

type ErrorCode = Extract<ReserveIdResult, { status: "error" }>["message"];

const ERRORS: Record<ErrorCode, string> = {
  unauthorized: "Not authorized.",
  generation_failed: "Could not reserve a free id. Try again.",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  reserved: "Reserved",
  active: "Active",
  lost: "Lost",
};

/** QR codes rendered per page; each one is computed when its card mounts. */
const PAGE_SIZE = 24;

type QrGeneratorProps = {
  /** Every id in the database, newest first. */
  initialEntries: PetEntrySummary;
  /** Public origin printed in the QR codes (already validated by the page). */
  origin: string;
};

export function QrGenerator({ initialEntries, origin }: QrGeneratorProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
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
          show(`Reserved ${result.entry.id}`, { variant: "info" });
        } else {
          show(ERRORS[result.message], { variant: "error" });
        }
      } catch {
        show("Something went wrong.", { variant: "error" });
      }
    });
  }

  return (
    <>
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
              <PetQrCard entry={entry} origin={origin} />
            </li>
          ))}
        </ul>
      )}

      {filtered.length > visible ? (
        <button
          type="button"
          onClick={() => setVisible((prev) => prev + PAGE_SIZE)}
          className="mt-6 rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5"
        >
          Load more ({filtered.length - visible} left)
        </button>
      ) : null}

      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleReserve}
          disabled={pending}
          className="rounded-full bg-ink px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-60"
        >
          {pending ? "Reserving…" : "Generate new QR code"}
        </button>
      </div>
    </>
  );
}
