"use client";

import { useState, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/ui/Card";
import { StickyHeader } from "@/ui/StickyHeader";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

import { submitPet, type SubmitState } from "../actions";
import { ImageUpload } from "./ImageUpload";

const MAX_GUARDIANS = 2;
const initialState: SubmitState = { status: "idle" };

type Dict = ReturnType<typeof getDictionary>;

// ── Phone mask ────────────────────────────────────────────────────────────────

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${ddd}) ${local}`;
  // 11 digits → 9-digit mobile: (DD) 9XXXX-XXXX
  if (digits.length === 11) return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
  // ≤10 digits → 8-digit landline: (DD) XXXX-XXXX
  return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
}

// ── Guardian fields ───────────────────────────────────────────────────────────

function GuardianFields({ index, dict }: { index: number; dict: Dict }) {
  const p = `g${index}_`;
  const isPrimary = index === 0;
  const [phone, setPhone] = useState("");

  return (
    <>
      <Field label={dict.guardianName} name={`${p}name`} required={isPrimary} autoComplete="name" />
      <Field
        label={dict.guardianEmailOptional}
        name={`${p}email`}
        type="email"
        autoComplete="email"
      />

      {/* Phone with mask */}
      <div>
        <label className="block">
          <span className="text-xs font-medium text-muted">
            {dict.guardianPhone}
            {isPrimary && <span className="ml-1 text-red-500">*</span>}
          </span>
          <input
            name={`${p}phone`}
            type="tel"
            required={isPrimary}
            autoComplete="tel"
            value={phone}
            placeholder="(48) 98123-4567"
            onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
        </label>
        <div className="mt-2 flex gap-4">
          {(
            [
              { name: `${p}phone_call`, label: dict.phoneChannelCall },
              { name: `${p}phone_whatsapp`, label: "WhatsApp" },
            ] as const
          ).map(({ name, label }) => (
            <label key={name} className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                name={name}
                defaultChecked
                className="rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Social links */}
      <div className="pt-1">
        <p className="mb-3 text-xs font-medium text-muted">{dict.socialSectionOptional}</p>
        <div className="space-y-4">
          <Field label="Instagram" name={`${p}social_instagram`} placeholder={dict.socialPlaceholder} />
          <Field label="X" name={`${p}social_x`} placeholder={dict.socialPlaceholder} />
          <Field label="Facebook" name={`${p}social_facebook`} placeholder={dict.socialPlaceholder} />
          <Field label="TikTok" name={`${p}social_tiktok`} placeholder={dict.socialPlaceholder} />
        </div>
      </div>
    </>
  );
}

// ── Guardian list (dynamic) ───────────────────────────────────────────────────

function GuardianList({ dict }: { dict: Dict }) {
  const [keys, setKeys] = useState<number[]>([0]);
  const nextKey = useRef(1);

  const add = () => {
    setKeys((k) => [...k, nextKey.current++]);
  };
  const remove = (idx: number) => {
    setKeys((k) => k.filter((_, i) => i !== idx));
  };

  return (
    <>
      {keys.map((key, idx) => (
        <Card
          key={key}
          title={idx === 0 ? dict.guardianSection : dict.guardianNumber(idx + 1)}
          headerAction={
            idx > 0 ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="mr-2 text-xs text-muted transition hover:text-red-500"
              >
                {dict.removeGuardian}
              </button>
            ) : undefined
          }
        >
          <GuardianFields index={idx} dict={dict} />
        </Card>
      ))}

      {keys.length < MAX_GUARDIANS && (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border border-dashed border-black/20 py-3 text-sm text-muted transition hover:border-ink/40 hover:text-ink"
        >
          + {dict.addGuardian}
        </button>
      )}
    </>
  );
}

// ── Root form ─────────────────────────────────────────────────────────────────

type PetFormProps = {
  hashId: string;
  locale: Locale;
};

export function PetForm({ hashId, locale }: PetFormProps) {
  const dict = getDictionary(locale);
  const [state, formAction] = useActionState<SubmitState, FormData>(
    submitPet.bind(null, hashId),
    initialState,
  );

  const errorMessage =
    state.status === "error"
      ? state.message === "invalid_picture"
        ? dict.errorPicture
        : state.message === "invalid_picture_type"
          ? dict.errorPictureType
          : state.message === "invalid_picture_size"
            ? dict.errorPictureSize
            : state.message === "invalid_birthdate"
              ? dict.errorBirthdate
              : dict.errorMissing
      : null;

  return (
    <>
      <StickyHeader />
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-14">
        <header className="mt-8 flex items-center">
          <div>
            <h1 className="text-xl font-bold text-ink">{dict.formTitle}</h1>
            <p className="mt-1 text-xs text-muted">{dict.formIntro(hashId)}</p>
          </div>
        </header>

        <form action={formAction} className="space-y-8">
          <Card title={dict.petSection}>
            <Field label={dict.petName} name="name" required autoComplete="off" />
            <ImageUpload name="picture" required locale={locale} />
            <Field label={dict.petBirthdate} name="birthdate" type="date" required />
          </Card>

          <GuardianList dict={dict} />

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <SubmitButton labelIdle={dict.submit} labelBusy={dict.submitting} />
        </form>
      </main>
    </>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
      />
    </label>
  );
}

function SubmitButton({ labelIdle, labelBusy }: { labelIdle: string; labelBusy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-pill transition hover:bg-ink/90 disabled:opacity-60"
    >
      {pending ? labelBusy : labelIdle}
    </button>
  );
}
