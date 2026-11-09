"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { getAllergySuggestions } from "@/lib/pet-suggestions";
import { collapseWhitespace, MAX_ALLERGIES, MAX_ALLERGY_LENGTH } from "@/lib/utils/pet-details";

import { OptionalTag } from "./FieldMarks";
import { HINT_CLASS, LABEL_CLASS } from "./fieldStyles";
import { SuggestInput } from "./SuggestInput";

/**
 * Dynamic list of free-text allergies, optional. The user types (with
 * suggestions) and presses Enter, comma, or picks a suggestion to add one;
 * each becomes a removable chip. Chips are submitted as repeated `allergies`
 * fields.
 *
 * Text still in the input when the form is submitted is sent too (as one more
 * `allergies` value), so it isn't silently lost. It is deliberately *not*
 * turned into a chip on blur: that grows the layout between a click's
 * mousedown and mouseup, so clicking "Publish" with an unconfirmed allergy
 * moved the button out from under the pointer and the first click did nothing.
 */
export function AllergiesField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const hintId = useId();
  const suggestions = useMemo(() => getAllergySuggestions(locale), [locale]);
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState("");

  const full = items.length >= MAX_ALLERGIES;

  const commit = (raw: string) => {
    const allergy = collapseWhitespace(raw);
    setText("");
    if (!allergy) return;
    setItems((current) => {
      const duplicate = current.some((a) => a.toLocaleLowerCase() === allergy.toLocaleLowerCase());
      return duplicate || current.length >= MAX_ALLERGIES ? current : [...current, allergy];
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === ",") {
      // Enter would otherwise submit the whole form.
      event.preventDefault();
      commit(text);
    } else if (event.key === "Backspace" && text === "" && items.length > 0) {
      setItems((current) => current.slice(0, -1));
    }
  };

  return (
    <div>
      {full ? (
        <p className={LABEL_CLASS}>{dict.petAllergies}</p>
      ) : (
        <SuggestInput
          label={dict.petAllergies}
          labelSuffix={<OptionalTag label={dict.optional} />}
          placeholder={dict.petAllergiesPlaceholder}
          value={text}
          onValueChange={setText}
          suggestions={suggestions}
          exclude={items}
          onSelect={commit}
          onKeyDown={handleKeyDown}
          maxLength={MAX_ALLERGY_LENGTH}
          describedBy={hintId}
        />
      )}
      <p id={hintId} className={HINT_CLASS}>
        {full ? dict.petAllergiesLimit(MAX_ALLERGIES) : dict.petAllergiesHint}
      </p>

      {items.length > 0 && (
        <ul aria-label={dict.petAllergies} className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1 rounded-full bg-white py-0.5 pl-3 pr-0.5 text-sm text-ink ring-1 ring-black/10"
            >
              <input type="hidden" name="allergies" value={item} />
              {item}
              <button
                type="button"
                aria-label={dict.removeAllergy(item)}
                onClick={() => setItems((current) => current.filter((a) => a !== item))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink/70 transition hover:bg-surface hover:text-red-700"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Unconfirmed text rides along with the chips (the server cleans and dedupes). */}
      {text.trim() && <input type="hidden" name="allergies" value={text} />}
    </div>
  );
}
