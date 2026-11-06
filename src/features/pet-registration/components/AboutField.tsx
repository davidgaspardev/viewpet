"use client";

import { useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { MAX_ABOUT_LENGTH } from "@/lib/utils/pet-details";

import { INPUT_CLASS } from "./fieldStyles";

/** Optional free-form paragraph about the pet. Submitted as `about`. */
export function AboutField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [text, setText] = useState("");

  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs font-medium text-muted">
        <span>
          {dict.petAbout}
          <span className="ml-1 font-normal">({dict.optional})</span>
        </span>
        <span aria-hidden="true" className="font-normal">
          {text.length}/{MAX_ABOUT_LENGTH}
        </span>
      </span>
      <textarea
        name="about"
        rows={4}
        maxLength={MAX_ABOUT_LENGTH}
        placeholder={dict.petAboutPlaceholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={`${INPUT_CLASS} resize-y`}
      />
    </label>
  );
}
