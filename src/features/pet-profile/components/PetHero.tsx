import Image from "next/image";
import { Logo } from "@/ui/Logo";

type PetHeroProps = {
  name: string;
  pictureUrl: string;
  ageLabel: string;
};

export function PetHero({ name, pictureUrl, ageLabel }: PetHeroProps) {
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
        <div className="absolute left-4 top-0 flex h-16 w-14 items-center justify-center rounded-b-2xl bg-white/50 backdrop-blur-md text-ink shadow-pill">
          <Logo className="h-12 w-12" />
        </div>

        {/* Top-right age pill */}
        <div className="absolute right-4 top-4 rounded-full bg-white/50 backdrop-blur-md px-4 py-2 text-sm font-bold text-ink shadow-pill">
          {ageLabel}
        </div>
      </div>

      {/* Name pill overlapping the bottom of the image */}
      <div className="relative -mt-16 flex justify-center">
        <span className="rounded-full bg-white/50 backdrop-blur-md px-8 py-3 text-lg font-bold text-ink shadow-pill">
          {name}
        </span>
      </div>
    </div>
  );
}
