"use client";

import { useEffect, useId, useState, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/ui/Card";
import { SnackbarProvider, useSnackbar } from "@/ui/Snackbar";
import { StickyHeader } from "@/ui/StickyHeader";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

import { submitPet, type SubmitState } from "../actions";
import { AboutField } from "./AboutField";
import { AllergiesField } from "./AllergiesField";
import { BirthdateField } from "./BirthdateField";
import { BreedField } from "./BreedField";
import { RequiredMark } from "./FieldMarks";
import { HINT_CLASS, INPUT_CLASS, LABEL_CLASS } from "./fieldStyles";
import { FormIntro } from "./FormIntro";
import { ImageUpload } from "./ImageUpload";
import { PhoneFields } from "./PhoneFields";

const MAX_GUARDIANS = 2;
const initialState: SubmitState = { status: "idle" };

type Dict = ReturnType<typeof getDictionary>;

/**
 * Layout, by width:
 *  - phones: one column of cards;
 *  - `sm`–`lg` (tablets): still one column, but wider, with short fields
 *    paired side by side (`FIELD_GRID`) so the page isn't a long ribbon;
 *  - `lg`: two columns — the pet on the left, the guardians on the right —
 *    where the cards are wide enough that pairing would be cramped.
 */
const FIELD_GRID = "grid gap-4 sm:max-lg:grid-cols-2";
const FULL_ROW = "sm:max-lg:col-span-2";

// ── Guardian fields ───────────────────────────────────────────────────────────

function GuardianFields({ index, dict }: { index: number; dict: Dict }) {
  const p = `g${index}_`;
  const isPrimary = index === 0;

  return (
    <div className={FIELD_GRID}>
      <Field
        label={dict.guardianName}
        name={`${p}name`}
        required={isPrimary}
        autoComplete="name"
        placeholder={dict.guardianNamePlaceholder}
        hint={isPrimary ? dict.guardianNameHint : undefined}
      />
      <Field
        label={dict.guardianEmailOptional}
        name={`${p}email`}
        type="email"
        autoComplete="email"
        placeholder={dict.guardianEmailPlaceholder}
        hint={isPrimary ? dict.guardianEmailHint : undefined}
      />

      <div className={FULL_ROW}>
        <PhoneFields prefix={p} isPrimaryGuardian={isPrimary} dict={dict} />
      </div>

      {/* Social links — most guardians fill none or one, so they start folded
          away (inputs inside a closed <details> are still submitted). */}
      <details className={`group rounded-lg border border-black/10 bg-white ${FULL_ROW}`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
          {dict.socialSectionOptional}
          <span aria-hidden="true" className="text-lg leading-none text-ink/70 transition group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="border-t border-black/10 px-3 py-4">
          <p className="mb-3 text-xs text-ink/70">{dict.socialHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram" name={`${p}social_instagram`} placeholder={dict.socialPlaceholder} />
            <Field label="X" name={`${p}social_x`} placeholder={dict.socialPlaceholder} />
            <Field label="Facebook" name={`${p}social_facebook`} placeholder={dict.socialPlaceholder} />
            <Field label="TikTok" name={`${p}social_tiktok`} placeholder={dict.socialPlaceholder} />
          </div>
        </div>
      </details>
    </div>
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
          step={idx === 0 ? 3 : undefined}
          title={idx === 0 ? dict.guardianSection : dict.guardianNumber(idx + 1)}
          description={idx === 0 ? dict.guardianSectionHint : undefined}
          headerAction={
            idx > 0 ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="mr-2 min-h-10 px-2 text-sm text-ink/70 transition hover:text-red-700"
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
        <div>
          <button
            type="button"
            onClick={add}
            className="min-h-11 w-full rounded-lg border border-dashed border-black/20 text-sm font-medium text-ink/80 transition hover:border-ink/40 hover:text-ink"
          >
            + {dict.addGuardian}
          </button>
          <p className="mt-1.5 text-center text-xs text-ink/70">{dict.addGuardianHint}</p>
        </div>
      )}
    </>
  );
}

// ── Root form ─────────────────────────────────────────────────────────────────

type PetFormProps = {
  hashId: string;
  locale: Locale;
};

export function PetForm(props: PetFormProps) {
  return (
    <SnackbarProvider closeLabel={getDictionary(props.locale).close}>
      <PetFormBody {...props} />
    </SnackbarProvider>
  );
}

function PetFormBody({ hashId, locale }: PetFormProps) {
  const dict = getDictionary(locale);
  const { show } = useSnackbar();
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
              : state.message === "invalid_details"
                ? dict.errorDetails
                : state.message === "invalid_phone"
                  ? dict.errorPhone
                  : state.message === "invalid_phone_channels"
                    ? dict.errorPhoneChannels
                    : dict.errorMissing
      : null;

  // `state` is a new object on every submission, so a repeated error is shown again.
  useEffect(() => {
    if (errorMessage) show(errorMessage, { variant: "error" });
  }, [state, errorMessage, show]);

  return (
    <>
      <StickyHeader />
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-16 pt-24 sm:max-w-2xl sm:px-6 lg:max-w-5xl">
        <FormIntro hashId={hashId} locale={locale} />

        <form action={formAction} className="mt-8 md:mt-10">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="space-y-6">
              <Card step={1} title={dict.petSection} description={dict.petSectionHint}>
                <div className={FIELD_GRID}>
                  <Field
                    label={dict.petName}
                    name="name"
                    required
                    autoComplete="off"
                    placeholder={dict.petNamePlaceholder}
                    hint={dict.petNameHint}
                  />
                  <GenderField dict={dict} />
                  <BreedField locale={locale} />
                  <BirthdateField locale={locale} />
                  <div className={FULL_ROW}>
                    <ImageUpload name="picture" required locale={locale} />
                  </div>
                </div>
              </Card>

              <Card step={2} title={dict.petDetailsSection} description={dict.petDetailsHint}>
                <AllergiesField locale={locale} />
                <AboutField locale={locale} />
              </Card>
            </div>

            <div className="space-y-6">
              <GuardianList dict={dict} />
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-md space-y-3 text-center">
            <p className="text-sm text-ink/70">{dict.submitNotice}</p>
            <SubmitButton labelIdle={dict.submit} labelBusy={dict.submitting} />
          </div>
        </form>
      </main>
    </>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

/** Male / female as two big tap targets; a real radio group underneath. */
function GenderField({ dict }: { dict: Dict }) {
  return (
    <fieldset>
      <legend className={LABEL_CLASS}>
        {dict.petGender}
        <RequiredMark />
      </legend>
      <div className="mt-1 flex gap-2">
        {([["male", dict.genderMale], ["female", dict.genderFemale]] as const).map(
          ([value, label]) => (
            <label key={value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value={value}
                required
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-center text-sm text-ink transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30">
                {label}
              </span>
            </label>
          ),
        )}
      </div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  /** Short explanation under the input — why it's asked, or what's done with it. */
  hint?: string;
}) {
  const hintId = useId();
  return (
    <div>
      <label className="block">
        <span className={LABEL_CLASS}>
          {label}
          {required && <RequiredMark />}
        </span>
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={hint ? hintId : undefined}
          className={INPUT_CLASS}
        />
      </label>
      {hint && (
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ labelIdle, labelBusy }: { labelIdle: string; labelBusy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-full bg-ink bg-[url(/noise-light.png)] px-6 text-base font-semibold text-white shadow-pill transition hover:bg-ink/90 disabled:opacity-60"
    >
      {pending ? labelBusy : labelIdle}
    </button>
  );
}
