"use client";

import { useEffect, useId, useRef, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { MAX_WEIGHT_KG, normalizeWeight } from "@/lib/utils/pet-details";

import { OptionalTag } from "./FieldMarks";
import { HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from "./fieldStyles";

/**
 * Optional weight in kg, typed with a comma or a point. A text input rather
 * than `type="number"`, which handles the pt-BR decimal comma inconsistently
 * across browsers. The unit sits inside the field so nobody types "kg".
 * Submitted as `weight`.
 */
export function WeightField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [text, setText] = useState("");

  // Same rule as the server action: block submission with the message instead of bouncing back.
  const message = normalizeWeight(text).ok ? "" : dict.errorWeight(MAX_WEIGHT_KG);
  const showError = message !== "" && text !== "";
  useEffect(() => {
    inputRef.current?.setCustomValidity(message);
  }, [message]);

  return (
    <div>
      <label className="block">
        {/* `block`: an inline label sits in a taller (inherited) line box than the
            neutered field's <legend>, which pushed this input a few px lower
            when the two share a row. */}
        <span className={`block ${LABEL_CLASS}`}>
          {dict.petWeight}
          <OptionalTag label={dict.optional} />
        </span>
        <span className="relative mt-1 block">
          <input
            ref={inputRef}
            name="weight"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            maxLength={6}
            placeholder={dict.petWeightPlaceholder}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-describedby={hintId}
            aria-invalid={showError || undefined}
            // `min-h-11` = the 44px of the neutered field's buttons beside it.
            className={`${INPUT_CLASS} !mt-0 min-h-11 pr-11`}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink/70"
          >
            kg
          </span>
        </span>
      </label>
      {/* `red-700` clears 4.5:1 on the card surface, as the required mark does. */}
      <p id={hintId} className={showError ? "mt-1 text-xs text-red-700" : HINT_CLASS}>
        {showError ? message : dict.petWeightHint}
      </p>
    </div>
  );
}
