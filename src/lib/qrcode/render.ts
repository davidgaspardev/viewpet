import QRCode from "qrcode";

export type QrSvgOptions = {
  /** `data:` URI (or URL) of the logo drawn in the centre of the code. */
  logoHref?: string;
  /** Dot and finder-pattern colour. */
  color?: string;
  /** Background colour; also used for the logo's backing disc. */
  background?: string;
  /** Text printed centred under the code (e.g. the pet id), outside the quiet zone. */
  label?: string;
};

/** Quiet zone around the code, in modules (the QR spec asks for 4). */
const MARGIN = 4;

/** Logo backing disc diameter as a fraction of the code's width. */
const LOGO_RATIO = 0.22;

/** Height, in modules, of the band under the quiet zone that holds the label. */
const LABEL_BAND = 4;

/** Label typography, in modules. Monospace glyphs advance ~0.6em. */
const LABEL_FONT_SIZE = 2.2;
const LABEL_LETTER_SPACING = 0.2;
const LABEL_ADVANCE = 0.6 * LABEL_FONT_SIZE + LABEL_LETTER_SPACING;

/** Free space kept on each side of the label, in modules. */
const LABEL_SIDE_PADDING = 2;

/** Fraction of a module's cell covered by its dot. */
const DOT_RATIO = 0.84;

/**
 * Render `text` as a self-contained SVG QR code in the "circle" style:
 * every data module is a round dot and the three finder patterns are
 * concentric rings. Error correction is fixed at level H (~30% recoverable)
 * so the logo punched out of the centre doesn't hurt scannability.
 */
export function renderQrSvg(text: string, options: QrSvgOptions = {}): string {
  const { logoHref, label, color = "#111b25", background = "#ffffff" } = options;

  const { modules } = QRCode.create(text, { errorCorrectionLevel: "H" });
  const fg = escapeAttr(color);
  const bg = escapeAttr(background);
  const count = modules.size;
  const size = count + MARGIN * 2;
  const height = label ? size + LABEL_BAND : size;
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
      if (logoHref && Math.hypot(cx - centre, cy - centre) < logoRadius + 0.5) continue;
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
      `<image xlink:href="${escapeAttr(logoHref)}" x="${centre - logoRadius * 0.85}" y="${centre - logoRadius * 0.85}" ` +
      `width="${logoRadius * 1.7}" height="${logoRadius * 1.7}"/>`
    : "";

  // Squeeze labels that wouldn't fit between the side paddings instead of clipping them.
  const labelMaxWidth = size - LABEL_SIDE_PADDING * 2;
  const labelFit =
    label && label.length * LABEL_ADVANCE > labelMaxWidth
      ? ` textLength="${labelMaxWidth}" lengthAdjust="spacingAndGlyphs"`
      : "";
  const labelSvg = label
    ? `<text x="${centre}" y="${size + LABEL_BAND * 0.62}" text-anchor="middle" ` +
      `font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${LABEL_FONT_SIZE}" ` +
      `letter-spacing="${LABEL_LETTER_SPACING}"${labelFit} fill="${fg}">${escapeText(label)}</text>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${height}" ` +
    `width="${size * 10}" height="${height * 10}" role="img" aria-label="${escapeAttr(label ? `QR code ${label}` : "QR code")}">` +
    `<rect width="${size}" height="${height}" fill="${bg}"/>` +
    `<g fill="${fg}">${dots.join("")}</g>${finders}${logoSvg}${labelSvg}</svg>`
  );
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
