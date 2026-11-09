type CardProps = {
  title: string;
  /** One line under the title saying what the section is for. */
  description?: string;
  /** Position in a sequence of sections, shown as a numbered badge before the title. */
  step?: number;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

export function Card({ title, description, step, headerAction, children }: CardProps) {
  return (
    <section className="rounded-card bg-surface bg-[url(/noise-light.png)]">
      <header className="mx-2 flex min-h-16 items-center justify-between gap-3 border-b border-black/10 py-4">
        <div className="flex min-w-0 items-center gap-3 pl-2">
          {step !== undefined && (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sage text-sm font-bold text-ink"
            >
              {step}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink/70">{description}</p>}
          </div>
        </div>
        {headerAction}
      </header>
      <div className="px-4 py-5 space-y-4">{children}</div>
    </section>
  );
}
