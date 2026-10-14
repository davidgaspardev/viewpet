import type { PetEntrySummary, PetEntrySummaryItem } from "@/lib/repository";
import type { PetStatus } from "@/types/pet";

export type StatusFilter = PetStatus | "all";

export const STATUS_FILTERS: readonly StatusFilter[] = ["all", "reserved", "active", "lost"];

/** Number of entries per status, plus the `all` total. */
export function countByStatus(entries: PetEntrySummary): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: entries.length, reserved: 0, active: 0, lost: 0 };
  for (const entry of entries) counts[entry.status]++;
  return counts;
}

export function filterByStatus(entries: PetEntrySummary, filter: StatusFilter): PetEntrySummaryItem[] {
  return filter === "all" ? entries : entries.filter((entry) => entry.status === filter);
}

/** Public URL a tag's QR code points at. */
export function petUrl(origin: string, id: string): string {
  return `${origin}/view/${id}`;
}
