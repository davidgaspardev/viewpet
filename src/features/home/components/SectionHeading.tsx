type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  /** Id of the <h2>, for the section's `aria-labelledby`. */
  id: string;
  align?: "left" | "center";
};

/** Eyebrow, title and optional lead shared by the home's sections. */
export function SectionHeading({ eyebrow, title, lead, id, align = "left" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sage" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-3 text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {lead && <p className="mt-4 text-base leading-relaxed text-ink/75 sm:text-lg">{lead}</p>}
    </div>
  );
}
