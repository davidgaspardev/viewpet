"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { applyDateMask, caretAfterMask, localTodayIso } from "@/lib/utils/birthdate";

import { birthdateFeedback } from "./birthdateFeedback";
import { INPUT_CLASS } from "./fieldStyles";

/**
 * Typed birthdate (`DD/MM/YYYY`, numeric keyboard) instead of a calendar
 * picker — see issue #34. The visible input has no `name`; the validated
 * value is submitted as `YYYY-MM-DD` through a hidden `birthdate` field, so
 * the server action is unchanged.
 */
export function BirthdateField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const { iso, message, showError, echo } = useMemo(
    () => birthdateFeedback(text, { today: localTodayIso(), touched, focused, locale }),
    [text, touched, focused, locale],
  );

  // Block native form submission with the same message (empty stays with `required`).
  useEffect(() => {
    inputRef.current?.setCustomValidity(message);
  }, [message]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div>
      <label className="block">
        <span className="text-xs font-medium text-muted">
          {dict.petBirthdate}
          <span className="ml-1 text-red-500">*</span>
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          value={text}
          placeholder={dict.petBirthdatePlaceholder}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTouched(true);
          }}
          aria-invalid={showError}
          aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
          className={`${INPUT_CLASS} ${showError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
        />
      </label>
      <input type="hidden" name="birthdate" value={iso} />
      <p id={hintId} className={`mt-1 text-[11px] ${echo ? "font-medium text-ink" : "text-muted"}`}>
        {echo ?? dict.petBirthdateHint}
      </p>
      {showError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
