"use client";

import { useRef, useState } from "react";

import type { getDictionary } from "@/lib/i18n";
import {
  applyPhoneMask,
  MAX_PHONES_PER_GUARDIAN,
  phoneInputProblem,
  SELECTABLE_PHONE_CHANNELS,
  type SelectablePhoneChannel,
} from "@/lib/utils/phone";

import { INPUT_CLASS } from "./fieldStyles";

type Dict = ReturnType<typeof getDictionary>;

/** What the guardian can be reached by on a new number. */
const DEFAULT_CHANNELS: Readonly<Record<SelectablePhoneChannel, boolean>> = {
  call: true,
  whatsapp: true,
  telegram: false,
};

function channelLabel(channel: SelectablePhoneChannel, dict: Dict): string {
  if (channel === "call") return dict.phoneChannelCall;
  if (channel === "whatsapp") return "WhatsApp";
  return "Telegram";
}

type PhoneRowProps = {
  /** Field-name prefix of this row, e.g. `g0_p1_` → `g0_p1_phone`, `g0_p1_call`. */
  name: string;
  /** 0 is the primary number. */
  row: number;
  required: boolean;
  onRemove?: () => void;
  dict: Dict;
};

function PhoneRow({ name, row, required, onRemove, dict }: PhoneRowProps) {
  const [phone, setPhone] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);
  const channelRefs = useRef<Array<HTMLInputElement | null>>([]);

  const label = row === 0 ? dict.cellphoneMain : dict.cellphoneNumber(row + 1);

  // Hold the submit with the browser's own message when the number can't be
  // used: cut short, or with no way to reach it. The channel checkboxes are
  // uncontrolled, so this reads what is actually ticked in the DOM — React's
  // automatic form reset after a server action can change them without any
  // event, and a copy of their state would drift from it. A blank number is
  // never a problem (an extra row left empty is ignored by the server).
  const syncValidity = (number: string) => {
    const hasChannel = channelRefs.current.some((box) => box?.checked);
    const problem = phoneInputProblem(number, hasChannel);
    phoneRef.current?.setCustomValidity(problem === "incomplete" ? dict.phoneIncomplete : "");
    channelRefs.current[0]?.setCustomValidity(
      problem === "no_channel" ? dict.phoneChannelRequired : "",
    );
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={`${name}phone`} className="text-xs font-medium text-muted">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={dict.removePhoneNumber(row + 1)}
            className="text-xs text-muted transition hover:text-red-500"
          >
            {dict.removePhone}
          </button>
        )}
      </div>
      <input
        ref={phoneRef}
        id={`${name}phone`}
        name={`${name}phone`}
        type="tel"
        required={required}
        autoComplete={row === 0 ? "tel" : "off"}
        value={phone}
        placeholder="(48) 98123-4567"
        onChange={(e) => {
          const masked = applyPhoneMask(e.target.value);
          setPhone(masked);
          syncValidity(masked);
        }}
        className={INPUT_CLASS}
      />
      <fieldset className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <legend className="sr-only">{dict.phoneChannelsLegend}</legend>
        {SELECTABLE_PHONE_CHANNELS.map((channel, i) => (
          <label key={channel} className="flex items-center gap-1.5 text-xs text-muted">
            <input
              ref={(el) => {
                channelRefs.current[i] = el;
              }}
              type="checkbox"
              name={`${name}${channel}`}
              defaultChecked={DEFAULT_CHANNELS[channel]}
              onChange={() => syncValidity(phone)}
              className="rounded"
            />
            {channelLabel(channel, dict)}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

/**
 * A guardian's phone numbers: the first is the primary one, and more can be
 * added (up to `MAX_PHONES_PER_GUARDIAN`). Each number picks its own ways to
 * be reached — call, WhatsApp, Telegram, any combination. Row `j` of guardian
 * `i` is submitted as `g<i>_p<j>_phone` plus a `g<i>_p<j>_<channel>` checkbox
 * per channel (see `parsePhones`).
 */
export function PhoneFields({
  prefix,
  isPrimaryGuardian,
  dict,
}: {
  /** `g<i>_` of the guardian these numbers belong to. */
  prefix: string;
  isPrimaryGuardian: boolean;
  dict: Dict;
}) {
  const [keys, setKeys] = useState<number[]>([0]);
  const nextKey = useRef(1);

  return (
    <div className="space-y-4">
      {keys.map((key, row) => (
        <PhoneRow
          key={key}
          name={`${prefix}p${row}_`}
          row={row}
          required={isPrimaryGuardian && row === 0}
          onRemove={row > 0 ? () => setKeys((k) => k.filter((_, i) => i !== row)) : undefined}
          dict={dict}
        />
      ))}

      {keys.length < MAX_PHONES_PER_GUARDIAN && (
        <button
          type="button"
          onClick={() => setKeys((k) => [...k, nextKey.current++])}
          className="w-full rounded-lg border border-dashed border-black/20 py-2.5 text-sm text-muted transition hover:border-ink/40 hover:text-ink"
        >
          + {dict.addPhone}
        </button>
      )}
    </div>
  );
}
