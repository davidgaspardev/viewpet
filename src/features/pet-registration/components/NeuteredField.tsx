import { getDictionary, type Locale } from "@/lib/i18n";

import { ChoiceGroup } from "./ChoiceGroup";

/**
 * Yes / No / Not sure. "Not sure" is the pre-selected answer and is sent as
 * an empty value, which the server stores as "not informed" — so a tutor who
 * skips the question never ends up published as "not neutered".
 */
export function NeuteredField({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <ChoiceGroup
      legend={dict.petNeutered}
      name="neutered"
      optionalLabel={dict.optional}
      defaultValue=""
      choices={[
        { value: "yes", label: dict.neuteredYes },
        { value: "no", label: dict.neuteredNo },
        { value: "", label: dict.neuteredUnknown },
      ]}
    />
  );
}
