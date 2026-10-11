/** Pure state helpers for the Snackbar stack, kept apart from React so they're unit-testable. */

export type SnackbarVariant = "info" | "warn" | "error";

export type SnackbarItem = {
  id: string;
  message: string;
  variant: SnackbarVariant;
  /** Auto-dismiss delay in ms, or `null` to stay until dismissed. */
  duration: number | null;
};

/** Most snackbars shown at once; the oldest is dropped beyond this. */
export const MAX_VISIBLE = 3;

export const DEFAULT_DURATION: Record<SnackbarVariant, number> = {
  info: 4000,
  warn: 6000,
  error: 8000,
};

/**
 * Append `next`. An identical message of the same variant is replaced (not
 * duplicated) so repeating an action refreshes the existing snackbar instead
 * of stacking copies.
 */
export function addSnackbar(items: SnackbarItem[], next: SnackbarItem): SnackbarItem[] {
  const rest = items.filter((i) => !(i.variant === next.variant && i.message === next.message));
  return [...rest, next].slice(-MAX_VISIBLE);
}

export function removeSnackbar(items: SnackbarItem[], id: string): SnackbarItem[] {
  return items.filter((i) => i.id !== id);
}
