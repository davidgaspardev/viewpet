"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { getAllergySuggestions } from "@/lib/pet-suggestions";
import { collapseWhitespace, MAX_ALLERGIES, MAX_ALLERGY_LENGTH } from "@/lib/utils/pet-details";

import { SuggestInput } from "./SuggestInput";

/**
 * Dynamic list of free-text allergies, optional. The user types (with
 * suggestions) and presses Enter, comma, or picks a suggestion to add one;
 * each becomes a removable chip. Chips are submitted as repeated `allergies`
 * fields. Text still in the input when focus leaves (e.g. on Publish) is added
 * too, so it isn't silently lost.
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
        <p className="text-xs font-medium text-muted">{dict.petAllergies}</p>
      ) : (
        <SuggestInput
          label={dict.petAllergies}
          labelSuffix={<span className="ml-1 font-normal">({dict.optional})</span>}
          placeholder={dict.petAllergiesPlaceholder}
          value={text}
          onValueChange={setText}
          suggestions={suggestions}
          exclude={items}
          onSelect={commit}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(text)}
          maxLength={MAX_ALLERGY_LENGTH}
          describedBy={hintId}
        />
      )}
      <p id={hintId} className="mt-1 text-xs text-muted">
        {full ? dict.petAllergiesLimit(MAX_ALLERGIES) : dict.petAllergiesHint}
      </p>

      {items.length > 0 && (
        <ul aria-label={dict.petAllergies} className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1 rounded-full bg-white py-1 pl-3 pr-1 text-sm text-ink ring-1 ring-black/10"
            >
              <input type="hidden" name="allergies" value={item} />
              {item}
              <button
                type="button"
                aria-label={dict.removeAllergy(item)}
                onClick={() => setItems((current) => current.filter((a) => a !== item))}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-red-500"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
