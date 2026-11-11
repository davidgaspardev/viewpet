/** The red `*` after a required field's label (red-700 is 5.86:1 on the card; red-500 was 3.41:1). */
export function RequiredMark() {
  // The input's own `required` is what assistive tech announces.
  return (
    <span aria-hidden="true" className="ml-1 text-red-700">
      *
    </span>
  );
}

/** "(optional)" after an optional field's label. */
export function OptionalTag({ label }: { label: string }) {
  return <span className="ml-1 font-normal text-ink/70">({label})</span>;
}
