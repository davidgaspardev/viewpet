/** Shared look of the form's text inputs. */
export const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10";

/**
 * Label above a field. 14px in the ink colour: the 12px `text-muted` it
 * replaces measured 3.96:1 on the card surface, under the 4.5:1 WCAG AA asks
 * of small text (ink is 12.7:1) — and 12px is a small target to read on a tablet.
 */
export const LABEL_CLASS = "text-sm font-medium text-ink";

/** Helper text under a field. `ink/70` is 5.07:1 on the card surface (`muted` was 3.96:1). */
export const HINT_CLASS = "mt-1 text-xs text-ink/70";
