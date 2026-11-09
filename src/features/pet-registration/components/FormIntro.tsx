import { getDictionary, type Locale } from "@/lib/i18n";
import { InfoCircleIcon } from "@/ui/icons";

type Dict = ReturnType<typeof getDictionary>;

function Steps({ dict }: { dict: Dict }) {
  return (
    // One panel with hairline dividers — three separate boxes read as clutter.
    <ol className="grid divide-y divide-black/10 overflow-hidden rounded-card bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {dict.formSteps.map((step, i) => (
        <li key={step.title} className="flex gap-3 px-4 py-3.5">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sage bg-[url(/noise-light.png)] text-sm font-bold text-ink"
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{step.title}</p>
            <p className="mt-0.5 text-sm text-ink/70">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * What the page is, what happens next, and what becomes public — the
 * things a guardian who just scanned a fresh tag has no way to know yet.
 * The three steps are collapsed on phones (the form should be the first
 * thing they see) and always open from `sm` up, where there's room.
 */
export function FormIntro({ hashId, locale }: { hashId: string; locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <header>
      <p className="inline-flex items-center gap-2 rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-ink/70">
        {dict.formTagLabel}
        <span className="font-mono text-ink">{hashId}</span>
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        {dict.formTitle}
      </h1>
      <p className="mt-2 max-w-prose text-base text-ink/80">{dict.formLead}</p>

      <div className="mt-5">
        <details className="group sm:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-card bg-surface px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {dict.formStepsTitle}
            <span aria-hidden="true" className="text-ink/70 transition group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-3">
            <Steps dict={dict} />
          </div>
        </details>
        <div className="hidden sm:block">
          <h2 className="sr-only">{dict.formStepsTitle}</h2>
          <Steps dict={dict} />
        </div>
      </div>

      <div
        role="note"
        className="mt-4 flex gap-3 rounded-card border border-sage/60 bg-sage/15 px-4 py-3 text-sm text-ink"
      >
        <InfoCircleIcon className="mt-0.5 h-5 w-5 flex-none" />
        <p>{dict.formPublicNotice}</p>
      </div>

      <p className="mt-4 text-sm text-ink/70">{dict.requiredLegend}</p>
    </header>
  );
}
