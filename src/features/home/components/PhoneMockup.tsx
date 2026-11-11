import { GenderMaleIcon, PhoneIcon, TelegramIcon, WhatsAppIcon } from "@/ui/icons";
import { Logo } from "@/ui/Logo";

/**
 * A static picture of the public pet page inside a phone, with an invented pet
 * (Thor) and a masked number. Nothing in it is a link or a control: it is
 * `aria-hidden`, and the text around it says what it shows.
 */
export function PhoneMockup({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`w-[15rem] select-none rounded-[2.4rem] border-[7px] border-ink bg-ink shadow-[0_30px_50px_-18px_rgba(31,45,61,0.55)] ${className}`}
    >
      <div className="overflow-hidden rounded-[1.8rem] bg-white">
        {/* Photo area: the brand mark stands in for a picture. */}
        <div className="relative flex h-36 items-center justify-center bg-gradient-to-b from-sage/70 to-sage/20">
          <Logo className="h-24 w-24 text-ink/20" />
        </div>
        <div className="-mt-5 flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-ink shadow-pill backdrop-blur-md">
            <GenderMaleIcon className="h-4 w-4" />
            Thor
          </span>
          <span className="mt-1 text-[0.7rem] text-ink/70">3 anos</span>
        </div>

        <div className="space-y-2.5 p-3">
          <div className="rounded-card bg-surface p-3">
            <p className="text-xs font-bold text-ink">Sobre Thor</p>
            <p className="mt-2 text-[0.65rem] font-medium text-muted">Raça</p>
            <p className="text-xs font-semibold text-ink">Husky Siberiano</p>
            <p className="mt-2 text-[0.65rem] font-medium text-muted">Alergias</p>
            <p className="mt-1 flex gap-1">
              <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] text-ink ring-1 ring-black/10">
                Frango
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] text-ink ring-1 ring-black/10">
                Pólen
              </span>
            </p>
          </div>

          <div className="rounded-card bg-surface p-3">
            <p className="text-xs font-bold text-ink">Contato do tutor</p>
            <p className="mt-2 text-[0.65rem] font-medium text-muted">Celular principal</p>
            <p className="whitespace-nowrap text-xs font-semibold text-ink">(11) 9••••-••••</p>
            <div className="mt-2 flex gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-ink">
                <WhatsAppIcon className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-ink">
                <TelegramIcon className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
                <PhoneIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
