import type { PetEntrySummary, PetEntrySummaryItem } from "@/lib/repository";
import { PET_STATUSES, type PetStatus } from "@/types/pet";

export type StatusFilter = PetStatus | "all";

export const STATUS_FILTERS: readonly StatusFilter[] = ["all", ...PET_STATUSES];

/** Admin-facing names of each status; shared by the filter chips and the card badges. */
export const STATUS_LABELS: Record<PetStatus, string> = {
  reserved: "Reserved",
  active: "Active",
  lost: "Lost",
};

export const FILTER_LABELS: Record<StatusFilter, string> = { all: "All", ...STATUS_LABELS };

/** Number of entries per status, plus the `all` total. */
export function countByStatus(entries: PetEntrySummary): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: entries.length, reserved: 0, active: 0, lost: 0 };
  for (const entry of entries) counts[entry.status]++;
  return counts;
}

export function filterByStatus(entries: PetEntrySummary, filter: StatusFilter): PetEntrySummaryItem[] {
  return filter === "all" ? entries : entries.filter((entry) => entry.status === filter);
}

/**
 * Filter to show once a new id was reserved. The new entry is `reserved`, so
 * any other filter would hide the card the admin just asked for.
 */
export function filterAfterReserve(filter: StatusFilter): StatusFilter {
  return filter === "reserved" ? filter : "all";
}
