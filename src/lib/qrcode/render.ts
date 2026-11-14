import QRCode from "qrcode";

export type QrSvgOptions = {
  /** `data:` URI (or URL) of the logo drawn in the centre of the code. */
  logoHref?: string;
  /** Dot and finder-pattern colour. */
  color?: string;
  /** Background colour; also used for the logo's backing disc. */
  background?: string;
  /** Text printed centred under the code (e.g. the pet id), close to it and clear of its modules. */
  label?: string;
  /**
   * Module shape. `true` (default) draws round dots and concentric-ring finder
   * patterns; `false` draws the standard square modules.
   */
  dots?: boolean;
  /**
   * Error-correction level. Defaults to `H` when there is a logo (it hides
   * the centre of the code, so the ~30% recovery covers it) and `Q` without
   * one: a plain code has nothing to make up for, and the lower level needs a
   * smaller, easier-to-scan grid while still surviving a worn or scratched tag.
   */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
};

/** Quiet zone around the code, in modules (the QR spec asks for 4). */
const MARGIN = 4;

/** Logo backing disc diameter as a fraction of the code's width. */
const LOGO_RATIO = 0.22;

/** Height, in modules, added under the quiet zone for the label (its line sits partly inside that zone). */
const LABEL_BAND = 3;

/** Clear space, in modules, between the code's last row and the top of the label's capitals. */
const LABEL_GAP = 2.5;

/** Capital height of the label's monospace font, as a fraction of its size. */
const LABEL_CAP_HEIGHT = 0.72;

/** Label typography, in modules. Monospace glyphs advance ~0.6em. */
const LABEL_FONT_SIZE = 3;
const LABEL_LETTER_SPACING = 0.3;
const LABEL_ADVANCE = 0.6 * LABEL_FONT_SIZE + LABEL_LETTER_SPACING;

/** Free space kept on each side of the label, in modules. */
const LABEL_SIDE_PADDING = 2;

/** Fraction of a module's cell covered by its dot. */
const DOT_RATIO = 0.84;

/**
 * Render `text` as a self-contained SVG QR code. By default it is drawn in
 * the "circle" style: every data module is a round dot and the three finder
 * patterns are concentric rings. With `dots: false` it is the standard code
 * of square modules. A `logoHref` punches a clear disc out of the centre (at
 * level H unless told otherwise, so the logo doesn't hurt scannability).
 */
export function renderQrSvg(text: string, options: QrSvgOptions = {}): string {
  const { logoHref, label, dots: rounded = true, color = "#111b25", background = "#ffffff" } = options;
  const { errorCorrectionLevel = logoHref ? "H" : "Q" } = options;

  const { modules } = QRCode.create(text, { errorCorrectionLevel });
  const fg = escapeAttr(color);
  const bg = escapeAttr(background);
  const count = modules.size;
  const size = count + MARGIN * 2;
  const height = label ? size + LABEL_BAND : size;
  const centre = size / 2;
  const logoRadius = (count * LOGO_RATIO) / 2;

  const inFinder = (row: number, col: number): boolean =>
    (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);

  /** Whether the module at (row, col) is dark and not under the logo. */
  const isDrawn = (row: number, col: number): boolean => {
    if (!modules.get(row, col)) return false;
    // Leave the logo area empty (plus half a module of breathing room).
    return !logoHref || Math.hypot(col + MARGIN + 0.5 - centre, row + MARGIN + 0.5 - centre) >= logoRadius + 0.5;
  };

  let body: string;
  if (rounded) {
    const dots: string[] = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (inFinder(row, col) || !isDrawn(row, col)) continue;
        dots.push(`<circle cx="${col + MARGIN + 0.5}" cy="${row + MARGIN + 0.5}" r="${DOT_RATIO / 2}"/>`);
      }
    }
    const finders = [
      [0, 0],
      [0, count - 7],
      [count - 7, 0],
    ]
      .map(([row, col]) => finder(col + MARGIN, row + MARGIN, fg, bg))
      .join("");
    body = `<g fill="${fg}">${dots.join("")}</g>${finders}`;
  } else {
    // Standard code: finders are ordinary modules. Horizontal runs of dark
    // modules are merged into one rectangle each, in a single path.
    const runs: string[] = [];
    for (let row = 0; row < count; row++) {
      let col = 0;
      while (col < count) {
        if (!isDrawn(row, col)) {
          col++;
          continue;
        }
        const start = col;
        while (col < count && isDrawn(row, col)) col++;
        runs.push(`M${start + MARGIN} ${row + MARGIN}h${col - start}v1h-${col - start}z`);
      }
    }
    body = `<path fill="${fg}" shape-rendering="crispEdges" d="${runs.join("")}"/>`;
  }

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
    ? `<text x="${centre}" y="${size - MARGIN + LABEL_GAP + LABEL_FONT_SIZE * LABEL_CAP_HEIGHT}" text-anchor="middle" ` +
      `font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${LABEL_FONT_SIZE}" ` +
      `letter-spacing="${LABEL_LETTER_SPACING}"${labelFit} fill="${fg}">${escapeText(label)}</text>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${height}" ` +
    `width="${size * 10}" height="${height * 10}" role="img" aria-label="${escapeAttr(label ? `QR code ${label}` : "QR code")}">` +
    `<rect width="${size}" height="${height}" fill="${bg}"/>` +
    `${body}${logoSvg}${labelSvg}</svg>`
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
