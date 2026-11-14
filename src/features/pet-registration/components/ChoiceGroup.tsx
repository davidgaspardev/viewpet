import { OptionalTag, RequiredMark } from "./FieldMarks";
import { LABEL_CLASS } from "./fieldStyles";

type Choice = { value: string; label: string };

type ChoiceGroupProps = {
  legend: string;
  /** Submitted field name; the checked option's `value` is what the server receives. */
  name: string;
  choices: readonly Choice[];
  /** Required groups have no pre-selected option; the browser asks for one on submit. */
  required?: boolean;
  /** Text for the "(optional)" tag; leave out for a required group. */
  optionalLabel?: string;
  /** Value pre-selected on first render (optional groups only). Uncontrolled. */
  defaultValue?: string;
  /**
   * Controlled mode, for when something else on the form depends on the choice
   * (species → breed suggestions): pass both `value` and `onValueChange`.
   */
  value?: string;
  onValueChange?: (value: string) => void;
};

/**
 * A few mutually exclusive options as big tap targets (a real radio group
 * underneath, so keyboard and screen readers behave). Used for gender, species
 * and neutered — short lists whose options are all worth seeing at once.
 */
export function ChoiceGroup({
  legend,
  name,
  choices,
  required = false,
  optionalLabel,
  defaultValue,
  value: selected,
  onValueChange,
}: ChoiceGroupProps) {
  const controlled = onValueChange !== undefined;
  return (
    <fieldset>
      <legend className={LABEL_CLASS}>
        {legend}
        {required && <RequiredMark />}
        {optionalLabel && <OptionalTag label={optionalLabel} />}
      </legend>
      <div className="mt-1 flex gap-2">
        {choices.map(({ value, label }) => (
          <label key={value} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={value}
              required={required}
              {...(controlled
                ? { checked: selected === value, onChange: () => onValueChange(value) }
                : { defaultChecked: defaultValue === value })}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-center text-sm text-ink transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
