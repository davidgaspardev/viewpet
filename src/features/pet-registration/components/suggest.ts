/** Most options the suggestion dropdown lists at once. */
export const MAX_VISIBLE_SUGGESTIONS = 6;

/** Lower-cased, accent-free form used for matching, so "mal" finds "Maltês". */
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase().trim();
}

type FilterOptions = {
  /** Entries to leave out (compared accent- and case-insensitively), e.g. allergies already added. */
  exclude?: readonly string[];
  limit?: number;
};

/**
 * Suggestions matching what the user has typed so far, best first: those
 * starting with the query, then those with a word starting with it, then any
 * containing it. An empty query matches nothing — the dropdown only opens once
 * the user starts typing. Ties keep the input order.
 */
export function filterSuggestions(
  query: string,
  suggestions: readonly string[],
  { exclude = [], limit = MAX_VISIBLE_SUGGESTIONS }: FilterOptions = {},
): string[] {
  const needle = normalizeForSearch(query);
  if (!needle) return [];

  const excluded = new Set(exclude.map(normalizeForSearch));
  const ranked: Array<{ suggestion: string; rank: number; order: number }> = [];

  suggestions.forEach((suggestion, order) => {
    const hay = normalizeForSearch(suggestion);
    if (excluded.has(hay)) return;
    const at = hay.indexOf(needle);
    if (at === -1) return;
    const rank = at === 0 ? 0 : /[\s(/-]/.test(hay[at - 1]) ? 1 : 2;
    ranked.push({ suggestion, rank, order });
  });

  return ranked
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((r) => r.suggestion);
}
