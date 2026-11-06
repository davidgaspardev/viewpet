"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { INPUT_CLASS } from "./fieldStyles";
import { filterSuggestions } from "./suggest";

type SuggestInputProps = {
  label: string;
  /** Rendered after the label, e.g. a required marker or "(optional)". */
  labelSuffix?: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  suggestions: readonly string[];
  /** Suggestions to leave out, e.g. allergies already added. */
  exclude?: readonly string[];
  /** Called after the user picks an option from the dropdown. */
  onSelect?: (value: string) => void;
  /** Runs after this component's own handling, so it can check `defaultPrevented`. */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  /** Form field name; leave out when a parent collects the value itself. */
  name?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
  describedBy?: string;
};

/**
 * Free-text input with a dropdown of suggestions that narrows as the user
 * types. Any text is accepted — suggestions only save typing. Follows the
 * ARIA combobox pattern (list autocomplete): arrow keys move through the
 * options, Enter picks the highlighted one, Escape closes the list.
 */
export function SuggestInput({
  label,
  labelSuffix,
  value,
  onValueChange,
  suggestions,
  exclude,
  onSelect,
  onKeyDown,
  onBlur,
  name,
  required,
  maxLength,
  placeholder,
  autoComplete = "off",
  describedBy,
}: SuggestInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const options = filterSuggestions(value, suggestions, { exclude });
  const expanded = open && options.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  const choose = (option: string) => {
    onValueChange(option);
    setOpen(false);
    setActive(-1);
    onSelect?.(option);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter/arrows while composing (IME) belong to the composition.
    if (event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) =>
        current === -1
          ? step === 1
            ? 0
            : options.length - 1
          : (current + step + options.length) % options.length,
      );
    } else if (event.key === "Enter" && expanded && active >= 0) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }

    onKeyDown?.(event);
  };

  return (
    <div className="relative">
      <label className="block">
        <span className="text-xs font-medium text-muted">
          {label}
          {labelSuffix}
        </span>
        <input
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={describedBy}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
            onBlur?.();
          }}
          className={INPUT_CLASS}
        />
      </label>

      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!expanded}
        className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-black/10 bg-white py-1 shadow-pill"
      >
        {options.map((option, index) => (
          <li
            key={option}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            // Keep focus in the input: a blur would close the list before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
            className={`cursor-pointer px-3 py-2 text-sm text-ink ${index === active ? "bg-surface" : "hover:bg-surface"}`}
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
}
