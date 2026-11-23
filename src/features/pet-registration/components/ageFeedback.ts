import { getDictionary, type Locale } from "@/lib/i18n";
import { formatBirthMonth } from "@/lib/utils/age";
import { birthdateFromAge } from "@/lib/utils/birthdate";

import type { BirthdateFeedback } from "./birthdateFeedback";

/** Digits only, as many as the field takes (`years` ≤ 2, `months` ≤ 4: "1188"). */
export const AGE_YEARS_MAX_LENGTH = 2;
export const AGE_MONTHS_MAX_LENGTH = 4;

/**
 * What the "I only know the age" fields derive from what was typed: the same
 * shape as `birthdateFeedback`, so the form treats both inputs alike. Years and
 * months add up (`2` + `4` and `0` + `28` are the same pet), and a blank one
 * counts as 0; both blank is "not informed", which is fine — the field is optional.
 *
 * A value that can only get worse (too old) is flagged at once; "less than a
 * month" waits until the user leaves the fields, since `0` is how `03` starts.
 */
export function ageFeedback(
  years: string,
  months: string,
  state: { today: string; touched: boolean; focused: boolean; locale: Locale },
): BirthdateFeedback {
  const dict = getDictionary(state.locale);
  const none = { iso: "", message: "", showError: false, echo: null };
  if (years === "" && months === "") return none;

  const fail = (message: string, immediate: boolean): BirthdateFeedback => ({
    ...none,
    message,
    showError: immediate || (state.touched && !state.focused),
  });

  if (!/^\d*$/.test(years) || !/^\d*$/.test(months)) return fail(dict.errorAgeInvalid, true);

  const result = birthdateFromAge(Number(years) * 12 + Number(months), state.today);
  if (!result.ok) {
    return result.error === "too_old"
      ? fail(dict.errorAgeTooOld, true)
      : fail(dict.errorAgeTooYoung, false);
  }

  const approxBirth = formatBirthMonth(result.iso, state.locale) ?? result.iso;
  return { iso: result.iso, message: "", showError: false, echo: dict.petAgeEcho(approxBirth) };
}
