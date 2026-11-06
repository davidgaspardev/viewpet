import type { Phone } from "@/types/pet";
import {
  isPlausibleBrazilPhone,
  MAX_PHONES_PER_GUARDIAN,
  SELECTABLE_PHONE_CHANNELS,
  toE164Brazil,
} from "@/lib/utils/phone";

import { readString } from "./form-data";

export type ParsedPhones =
  | { ok: true; phones: Phone[] }
  /**
   * `missing_fields`: the guardian gave no number at all.
   * `invalid_phone`: a number that can't be a Brazilian phone (too short, or text).
   * `invalid_phone_channels`: a number was given with no way to reach it.
   */
  | { ok: false; error: "missing_fields" | "invalid_phone" | "invalid_phone_channels" };

/**
 * Reads one guardian's phone numbers from the registration form. Row `j` is
 * submitted as `<prefix>p<j>_phone` plus one `<prefix>p<j>_<channel>` checkbox
 * per channel. The order of the rows is the order of the result, and the first
 * number is the primary one.
 *
 * - A row without a number is ignored (an extra row the user left blank — its
 *   checkboxes are ticked by default, so they must not count on their own).
 * - A number that isn't 10–11 digits (with or without the country code) is an
 *   error: stored as typed it would become a dead `tel:` / `wa.me` link.
 * - A number with no channel ticked is an error: it could not be used.
 * - The same number typed twice (however it is formatted) is kept once, at its
 *   first position, with the channels of both rows combined.
 *
 * Not part of `actions.ts` because a `"use server"` module may only export
 * async functions.
 */
export function parsePhones(form: FormData, prefix: string): ParsedPhones {
  const phones: Phone[] = [];

  for (let row = 0; row < MAX_PHONES_PER_GUARDIAN; row++) {
    const display = readString(form, `${prefix}p${row}_phone`);
    if (!display) continue;

    if (!isPlausibleBrazilPhone(display)) return { ok: false, error: "invalid_phone" };

    const channels = SELECTABLE_PHONE_CHANNELS.filter(
      (channel) => form.get(`${prefix}p${row}_${channel}`) === "on",
    );
    if (channels.length === 0) return { ok: false, error: "invalid_phone_channels" };

    const e164 = toE164Brazil(display);
    const existing = phones.find((phone) => phone.e164 === e164);
    if (existing) {
      existing.channels = SELECTABLE_PHONE_CHANNELS.filter(
        (channel) => existing.channels.includes(channel) || channels.includes(channel),
      );
    } else {
      phones.push({ e164, display, channels });
    }
  }

  if (phones.length === 0) return { ok: false, error: "missing_fields" };
  return { ok: true, phones };
}
