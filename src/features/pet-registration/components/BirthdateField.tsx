"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { applyDateMask, caretAfterMask, localTodayIso } from "@/lib/utils/birthdate";

import { AGE_MONTHS_MAX_LENGTH, AGE_YEARS_MAX_LENGTH, ageFeedback } from "./ageFeedback";
import { birthdateFeedback } from "./birthdateFeedback";
import { ChoiceGroup } from "./ChoiceGroup";
import { INPUT_CLASS, LABEL_CLASS } from "./fieldStyles";

type Mode = "date" | "age";

const digitsOnly = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

/**
 * Optional birthdate, entered one of two ways: typed (`DD/MM/YYYY`, numeric
 * keyboard) instead of a calendar picker — see issue #34 — or, for the many
 * pets adopted without a known birthday, as an age ("2 years and 4 months" or
 * "33 months"). The age becomes a birthdate here, in the browser
 * (`birthdateFromAge`). Either way the visible inputs have no `name`; what is
 * submitted is a `YYYY-MM-DD` in a hidden `birthdate` field — empty when the
 * tutor left both blank — so the server action only ever sees a date. (The two
 * mode radios do carry a `birthdate_mode` name, which keeps them one keyboard
 * group; the server ignores it.)
 */
export function BirthdateField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const dateRef = useRef<HTMLInputElement>(null);
  const yearsRef = useRef<HTMLInputElement>(null);
  const monthsRef = useRef<HTMLInputElement>(null);
  // The age input edited last: the one the browser's validation bubble should point at.
  const lastEditedRef = useRef<"years" | "months">("months");
  const hintId = useId();
  const errorId = useId();
  const [mode, setMode] = useState<Mode>("date");
  // Both inputs keep what was typed when the tutor flips between them; only the active one is submitted.
  const [text, setText] = useState("");
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const { iso, message, showError, echo } = useMemo(() => {
    const state = { today: localTodayIso(), touched, focused, locale };
    return mode === "date" ? birthdateFeedback(text, state) : ageFeedback(years, months, state);
  }, [mode, text, years, months, touched, focused, locale]);

  // Block native form submission with the same message. Nothing here is
  // `required`: an empty field has no message and the form goes through.
  useEffect(() => {
    dateRef.current?.setCustomValidity(message);
    const [target, other] =
      lastEditedRef.current === "years" ? [yearsRef, monthsRef] : [monthsRef, yearsRef];
    target.current?.setCustomValidity(message);
    other.current?.setCustomValidity("");
  }, [message, mode, years, months]);

  const changeMode = (next: string) => {
    setMode(next === "age" ? "age" : "date");
    setFocused(false);
  };

  const onDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const raw = input.value;
    const masked = applyDateMask(raw);
    const caret = caretAfterMask(raw, input.selectionStart ?? raw.length, masked);
    setText(masked);
    // React rewrites the controlled value after this handler, which sends the
    // caret to the end; put it back so editing mid-string keeps its place.
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.setSelectionRange(caret, caret);
    });
  };

  const focusProps = {
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setTouched(true);
    },
  };
  // Years and months are one field to the tutor: moving between them is not
  // "leaving" it, so an incomplete value doesn't flash an alert on the way.
  const ageFocusProps = {
    onFocus: () => setFocused(true),
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      setFocused(false);
      setTouched(true);
    },
  };
  const invalidClass = showError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "";

  return (
    <div>
      <ChoiceGroup
        legend={dict.petBirthdate}
        optionalLabel={dict.optional}
        name="birthdate_mode"
        choices={[
          { value: "date", label: dict.petBirthdateModeDate },
          { value: "age", label: dict.petBirthdateModeAge },
        ]}
        value={mode}
        onValueChange={changeMode}
      />

      <div className="mt-3">
        {mode === "date" ? (
          <input
            ref={dateRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={dict.petBirthdate}
            value={text}
            placeholder={dict.petBirthdatePlaceholder}
            onChange={onDateChange}
            {...focusProps}
            aria-invalid={showError}
            aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
            className={`${INPUT_CLASS} !mt-0 ${invalidClass}`}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3" {...ageFocusProps}>
            <label className="block">
              <span className={LABEL_CLASS}>{dict.petAgeYears}</span>
              <input
                ref={yearsRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={AGE_YEARS_MAX_LENGTH}
                value={years}
                placeholder="2"
                onChange={(e) => {
                  lastEditedRef.current = "years";
                  setYears(digitsOnly(e.target.value, AGE_YEARS_MAX_LENGTH));
                }}
                aria-invalid={showError}
                aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
                className={`${INPUT_CLASS} ${invalidClass}`}
              />
            </label>
            <label className="block">
              <span className={LABEL_CLASS}>{dict.petAgeMonths}</span>
              <input
                ref={monthsRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={AGE_MONTHS_MAX_LENGTH}
                value={months}
                placeholder="4"
                onChange={(e) => {
                  lastEditedRef.current = "months";
                  setMonths(digitsOnly(e.target.value, AGE_MONTHS_MAX_LENGTH));
                }}
                aria-invalid={showError}
                aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
                className={`${INPUT_CLASS} ${invalidClass}`}
              />
            </label>
          </div>
        )}
      </div>

      <input type="hidden" name="birthdate" value={iso} />
      <p id={hintId} className={`mt-1 text-xs ${echo ? "font-medium text-ink" : "text-ink/70"}`}>
        {echo ?? (mode === "date" ? dict.petBirthdateHint : dict.petAgeHint)}
      </p>
      {showError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-700">
          {message}
        </p>
      )}
    </div>
  );
}
