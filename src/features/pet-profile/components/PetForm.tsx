"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Logo } from "@/ui/Logo";
import { Card } from "@/ui/Card";
import { StickyHeader } from "@/ui/StickyHeader";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

import { submitPet, type SubmitState } from "@/app/view/[id]/actions";
import { ImageUpload } from "./ImageUpload";

const initialState: SubmitState = { status: "idle" };

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
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-16 pt-[6.5rem]">
      <header className="mb-8 flex items-center gap-3">
        <Logo className="h-10 w-10 text-ink" />
        <div>
          <h1 className="text-xl font-bold text-ink">{dict.formTitle}</h1>
          <p className="mt-1 text-xs text-muted">{dict.formIntro(hashId)}</p>
        </div>
      </header>

      <form action={formAction} className="space-y-8">
        <Card title={dict.petSection}>
          <Field label={dict.petName} name="name" required autoComplete="off" />
          <ImageUpload name="picture" required locale={locale} />
          <Field
            label={dict.petBirthdate}
            name="birthdate"
            type="date"
            required
          />
        </Card>

        <Card title={dict.guardianSection}>
          <Field label={dict.guardianName} name="guardianName" required />
          <Field
            label={dict.guardianEmailOptional}
            name="guardianEmail"
            type="email"
            autoComplete="email"
          />
          <PhoneField label={dict.guardianPhone} />
        </Card>

        <Card title={dict.socialSectionOptional}>
          <Field
            label="Instagram"
            name="social_instagram"
            placeholder={dict.socialPlaceholder}
          />
          <Field
            label="X"
            name="social_x"
            placeholder={dict.socialPlaceholder}
          />
          <Field
            label="Facebook"
            name="social_facebook"
            placeholder={dict.socialPlaceholder}
          />
          <Field
            label="TikTok"
            name="social_tiktok"
            placeholder={dict.socialPlaceholder}
          />
        </Card>

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

function PhoneField({ label }: { label: string }) {
  return (
    <div>
      <label className="block">
        <span className="text-xs font-medium text-muted">
          {label}
          <span className="ml-1 text-red-500">*</span>
        </span>
        <input
          name="guardianPhone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="(48) 98123-4567"
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-base text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
      </label>
      <div className="mt-2 flex gap-4">
        {(
          [
            { name: "guardianPhone_call", label: "Chamadas" },
            { name: "guardianPhone_whatsapp", label: "WhatsApp" },
            { name: "guardianPhone_sms", label: "SMS" },
          ] as const
        ).map(({ name, label: chLabel }) => (
          <label key={name} className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              name={name}
              defaultChecked={name !== "guardianPhone_sms"}
              className="rounded"
            />
            {chLabel}
          </label>
        ))}
      </div>
    </div>
  );
}

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

function SubmitButton({
  labelIdle,
  labelBusy,
}: {
  labelIdle: string;
  labelBusy: string;
}) {
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
