import QRCode from "qrcode";

export type QrSvgOptions = {
  /** `data:` URI (or URL) of the logo drawn in the centre of the code. */
  logoHref?: string;
  /** Dot and finder-pattern colour. */
  color?: string;
  /** Background colour; also used for the logo's backing disc. */
  background?: string;
};

/** Quiet zone around the code, in modules (the QR spec asks for 4). */
const MARGIN = 4;

/** Logo backing disc diameter as a fraction of the code's width. */
const LOGO_RATIO = 0.22;

/** Fraction of a module's cell covered by its dot. */
const DOT_RATIO = 0.84;

/**
 * Render `text` as a self-contained SVG QR code in the "circle" style:
 * every data module is a round dot and the three finder patterns are
 * concentric rings. Error correction is fixed at level H (~30% recoverable)
 * so the logo punched out of the centre doesn't hurt scannability.
 */
export function renderQrSvg(text: string, options: QrSvgOptions = {}): string {
  const { logoHref, color = "#111b25", background = "#ffffff" } = options;
  const hasLogo = Boolean(logoHref);

  const { modules } = QRCode.create(text, { errorCorrectionLevel: "H" });
  const fg = escapeAttr(color);
  const bg = escapeAttr(background);
  const count = modules.size;
  const size = count + MARGIN * 2;
  const centre = size / 2;
  const logoRadius = (count * LOGO_RATIO) / 2;

  const inFinder = (row: number, col: number): boolean =>
    (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);

  const dots: string[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!modules.get(row, col) || inFinder(row, col)) continue;
      const cx = col + MARGIN + 0.5;
      const cy = row + MARGIN + 0.5;
      // Leave the logo area empty (plus half a module of breathing room).
      if (hasLogo && Math.hypot(cx - centre, cy - centre) < logoRadius + 0.5) continue;
      dots.push(`<circle cx="${cx}" cy="${cy}" r="${DOT_RATIO / 2}"/>`);
    }
  }

  const finders = [
    [0, 0],
    [0, count - 7],
    [count - 7, 0],
  ]
    .map(([row, col]) => finder(col + MARGIN, row + MARGIN, fg, bg))
    .join("");

  const logoSvg = logoHref
    ? `<circle cx="${centre}" cy="${centre}" r="${logoRadius}" fill="${bg}"/>` +
      `<image href="${escapeAttr(logoHref)}" x="${centre - logoRadius * 0.85}" y="${centre - logoRadius * 0.85}" ` +
      `width="${logoRadius * 1.7}" height="${logoRadius * 1.7}"/>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `width="${size * 10}" height="${size * 10}" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="${bg}"/>` +
    `<g fill="${fg}">${dots.join("")}</g>${finders}${logoSvg}</svg>`
  );
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** A 7×7-module finder pattern drawn as three concentric circles. */
function finder(x: number, y: number, color: string, background: string): string {
  const cx = x + 3.5;
  const cy = y + 3.5;
  return (
    `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${color}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${background}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${color}"/>`
  );
}
