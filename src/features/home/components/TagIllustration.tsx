import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";

/** What the illustration's QR Code opens when someone scans the screen: the site itself. */
const QR_TARGET = process.env.SITE_URL ?? "https://viewpet.info";

const QR_SVG = renderQrSvg(QR_TARGET, {
  logoHref: LOGO_DATA_URI,
  color: "#1F2D3D",
  background: "#ffffff",
});

type TagIllustrationProps = {
  /** Name engraved on the tag. */
  name: string;
  /** Swing slowly from the ring (motion-safe only). */
  swing?: boolean;
  className?: string;
};

/**
 * A flat illustration of the product: a dark enamel pendant hanging from its
 * ring, with the pet's name and a QR Code. Drawn with CSS and an inline SVG
 * (no 3D scene, no image), so it costs nothing to load.
 */
export function TagIllustration({ name, swing = false, className = "" }: TagIllustrationProps) {
  return (
    <div
      role="img"
      aria-label={`Plaquinha de metal com o nome ${name} gravado e um QR Code`}
      className={`relative aspect-[4/5] w-full max-w-[17rem] origin-top ${
        swing ? "motion-safe:animate-sway" : ""
      } ${className}`}
    >
      {/* Ring: its lower half hides behind the pendant. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-[27%] w-[21%] -translate-x-1/2 rounded-full border-[7px] border-[#c4ccd4] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 flex aspect-square flex-col items-center justify-center gap-[5%] overflow-hidden rounded-full bg-ink bg-[url(/noise-light.png)] shadow-[0_28px_44px_-14px_rgba(31,45,61,0.6)] ring-1 ring-white/10"
      >
        {/* Engraved rim and a soft highlight, so the disc reads as metal. */}
        <div className="absolute inset-[4.5%] rounded-full border border-white/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.24),transparent_55%)]" />

        <span className="relative text-lg font-semibold tracking-[0.4em] text-white/90">
          <span className="pl-[0.4em]">{name.toUpperCase()}</span>
        </span>
        <div
          className="relative aspect-square w-[50%] rounded-xl bg-white p-[3%] shadow-[0_2px_10px_rgba(0,0,0,0.25)] [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: QR_SVG }}
        />
        <span className="relative text-[0.6rem] font-medium uppercase tracking-[0.28em] text-white/65">
          Escaneie e ligue
        </span>
      </div>
    </div>
  );
}
