/** Pure state helpers for the Snackbar stack, kept apart from React so they're unit-testable. */

export type SnackbarVariant = "info" | "warn" | "error";

export type SnackbarItem = {
  id: string;
  message: string;
  variant: SnackbarVariant;
  /** Auto-dismiss delay in ms, or `null` to stay until dismissed. */
  duration: number | null;
};

/** Most snackbars shown at once. */
export const MAX_VISIBLE = 3;

/**
 * Default auto-dismiss delay per variant. Errors stay until dismissed: a
 * message that disappears on a timer is easy to miss, and an error is exactly
 * the one the user must not miss.
 */
export const DEFAULT_DURATION: Record<SnackbarVariant, number | null> = {
  info: 4000,
  warn: 6000,
  error: null,
};

/** setTimeout fires immediately for delays above this (2^31 - 1). */
const MAX_TIMEOUT = 2_147_483_647;

/**
 * The delay to use for `show(message, { duration })`. `undefined` means "the
 * variant's default"; `null` and non-finite values (e.g. `Infinity`) mean
 * "stay until dismissed"; anything else is clamped to what setTimeout supports.
 */
export function resolveDuration(
  variant: SnackbarVariant,
  duration: number | null | undefined,
): number | null {
  if (duration === undefined) return DEFAULT_DURATION[variant];
  if (duration === null || !Number.isFinite(duration)) return null;
  return Math.min(Math.max(0, duration), MAX_TIMEOUT);
}

/**
 * Append `next`. An identical message of the same variant is replaced (not
 * duplicated) so repeating an action refreshes the existing snackbar instead
 * of stacking copies. When the stack overflows, the oldest non-error goes
 * first, so a flurry of info toasts can't push out an unread error.
 */
export function addSnackbar(items: SnackbarItem[], next: SnackbarItem): SnackbarItem[] {
  let kept = items.filter((i) => !(i.variant === next.variant && i.message === next.message));
  while (kept.length + 1 > MAX_VISIBLE) {
    const evict = kept.findIndex((i) => i.variant !== "error");
    kept = kept.filter((_, index) => index !== (evict === -1 ? 0 : evict));
  }
  return [...kept, next];
}

export function removeSnackbar(items: SnackbarItem[], id: string): SnackbarItem[] {
  return items.filter((i) => i.id !== id);
}
