import { getDictionary, type Locale } from "@/lib/i18n";
import {
  formatBirthdateLong,
  parseMaskedBirthdate,
  type BirthdateError,
} from "@/lib/utils/birthdate";

/** Length of a fully typed `DD/MM/YYYY`. */
export const MASKED_LENGTH = 10;

export type BirthdateFeedback = {
  /** Value to submit (`YYYY-MM-DD`), or "" while the text isn't a valid date. */
  iso: string;
  /** Validation message for the current text ("" when it is valid or empty). */
  message: string;
  /** Whether `message` should be shown inline right now. */
  showError: boolean;
  /** The interpreted date in words once valid, so a misread order is visible. */
  echo: string | null;
};

type Dict = ReturnType<typeof getDictionary>;

function messageFor(error: BirthdateError, dict: Dict): string {
  switch (error) {
    case "incomplete":
      return dict.errorBirthdateIncomplete;
    case "future":
      return dict.errorBirthdateFuture;
    case "too_old":
      return dict.errorBirthdateTooOld;
    case "invalid":
      return dict.errorBirthdate;
  }
}

/**
 * Everything the birthdate field derives from what was typed. Errors are shown
 * as soon as a full date is typed, or once the user has left the field — never
 * while they are still typing an incomplete value.
 */
export function birthdateFeedback(
  text: string,
  state: { today: string; touched: boolean; focused: boolean; locale: Locale },
): BirthdateFeedback {
  const dict = getDictionary(state.locale);
  const result = parseMaskedBirthdate(text, state.today);

  if (result.ok) {
    return {
      iso: result.iso,
      message: "",
      showError: false,
      echo: formatBirthdateLong(result.iso, state.locale),
    };
  }

  const message = text === "" ? "" : messageFor(result.error, dict);
  const complete = text.length === MASKED_LENGTH;
  return {
    iso: "",
    message,
    showError: message !== "" && (complete || (state.touched && !state.focused)),
    echo: null,
  };
}
