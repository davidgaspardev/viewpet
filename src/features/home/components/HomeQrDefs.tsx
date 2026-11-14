import { HOME_QR_ID, homeQrSymbol } from "../qr";

/**
 * The home's QR Code, defined once for the whole page. Each `TagIllustration`
 * draws it with a `<use>`, so it has to be on the same page. Zero-sized rather
 * than `display: none`, which some browsers do not draw `<use>` content from.
 */
export function HomeQrDefs() {
  const { viewBox, content } = homeQrSymbol(process.env.SITE_URL);

  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <symbol id={HOME_QR_ID} viewBox={viewBox} dangerouslySetInnerHTML={{ __html: content }} />
    </svg>
  );
}
