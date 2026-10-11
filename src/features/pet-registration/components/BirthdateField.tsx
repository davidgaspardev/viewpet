"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { getDictionary } from "@/lib/i18n";
import {
  applyDateMask,
  localTodayIso,
  parseMaskedBirthdate,
  type BirthdateError,
} from "@/lib/utils/birthdate";

import { INPUT_CLASS } from "./fieldStyles";

type Dict = ReturnType<typeof getDictionary>;

const MASKED_LENGTH = "DD/MM/YYYY".length;

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
 * Typed birthdate (`DD/MM/YYYY`, numeric keyboard) instead of a calendar
 * picker — see issue #34. The visible input has no `name`; the validated
 * value is submitted as `YYYY-MM-DD` through a hidden `birthdate` field, so
 * the server action is unchanged.
 */
export function BirthdateField({ dict }: { dict: Dict }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);

  const result = useMemo(() => parseMaskedBirthdate(text, localTodayIso()), [text]);
  const message = !result.ok && text !== "" ? messageFor(result.error, dict) : "";

  // Show the error once the field was left, or as soon as a full date is typed.
  const showError = message !== "" && (touched || text.length === MASKED_LENGTH);

  // Block native form submission with the same message (empty stays with `required`).
  useEffect(() => {
    inputRef.current?.setCustomValidity(message);
  }, [message]);

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
          maxLength={MASKED_LENGTH}
          value={text}
          placeholder={dict.petBirthdatePlaceholder}
          onChange={(e) => setText(applyDateMask(e.target.value))}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
          className={`${INPUT_CLASS} ${showError ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
        />
      </label>
      <input type="hidden" name="birthdate" value={result.ok ? result.iso : ""} />
      <p id={hintId} className="mt-1 text-[11px] text-muted">
        {dict.petBirthdateHint}
      </p>
      {showError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
