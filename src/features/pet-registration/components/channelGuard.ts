/** Just what the guard needs from a checkbox, so it can be tested without a DOM. */
type ChannelBox = { checked: boolean };

/**
 * A phone number needs at least one way to be reached. Call right after
 * `changed` was toggled: if that left every box unticked, ticks it again and
 * returns `true` so the caller can say why. The boxes are uncontrolled, so the
 * DOM is the source of truth and is corrected directly.
 */
export function keepOneChannel(boxes: ReadonlyArray<ChannelBox | null>, changed: ChannelBox): boolean {
  if (boxes.some((box) => box?.checked)) return false;
  changed.checked = true;
  return true;
}
