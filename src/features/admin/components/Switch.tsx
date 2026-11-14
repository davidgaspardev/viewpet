type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** A labelled on/off toggle. The whole row is the button, so the label is clickable too. */
export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 rounded-full text-xs font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span
        aria-hidden
        className={`relative h-5 w-9 flex-none rounded-full border transition-colors ${
          checked ? "border-ink bg-ink" : "border-black/30 bg-white"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            checked ? "left-[1.1rem] bg-white" : "left-0.5 bg-black/40"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
