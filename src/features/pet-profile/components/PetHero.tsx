import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";
import { GenderFemaleIcon, GenderMaleIcon } from "@/ui/icons";
import { Logo } from "@/ui/Logo";

type PetHeroProps = {
  name: string;
  pictureUrl: string;
  ageLabel: string;
  gender?: "male" | "female";
  locale: Locale;
};

export function PetHero({ name, pictureUrl, ageLabel, gender, locale }: PetHeroProps) {
  const dict = getDictionary(locale);
  return (
    <div className="relative w-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden sm:aspect-[4/3] md:aspect-[16/10]">
        <Image
          src={pictureUrl}
          alt={name}
          fill
          priority
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover rounded-b-2xl"
        />

        {/* Top-left logo chip */}
        <div className="absolute left-4 top-0 flex h-16 w-14 items-center justify-center rounded-b-2xl bg-white/65 backdrop-blur-md text-ink">
          <Logo className="h-12 w-12" />
        </div>

        {/* Top-right age pill */}
        <div className="absolute right-0 top-4 rounded-l-full bg-white/65 backdrop-blur-md px-4 py-2 text-sm font-bold text-ink">
          {ageLabel}
        </div>
      </div>

      {/* Name pill overlapping the bottom of the image */}
      <div className="relative -mt-16 flex flex-col items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/65 backdrop-blur-md px-6 py-3 text-lg font-bold text-ink">
          {gender === "male" && <GenderMaleIcon className="h-5 w-5 flex-none" title={dict.genderMale} />}
          {gender === "female" && <GenderFemaleIcon className="h-5 w-5 flex-none" title={dict.genderFemale} />}
          {name}
        </span>
      </div>
    </div>
  );
}
