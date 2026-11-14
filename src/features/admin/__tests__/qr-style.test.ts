import { describe, expect, test } from "bun:test";

import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";

import { DEFAULT_QR_STYLE, tagQrOptions } from "../qr-style";

const url = "https://viewpet.example/tag/abcd2345efgh";

describe("DEFAULT_QR_STYLE", () => {
  test("keeps today's look: logo in the middle and round dots", () => {
    expect(DEFAULT_QR_STYLE).toEqual({ logo: true, dots: true });
  });

  test("renders exactly what the admin printed before the switches existed", () => {
    expect(renderQrSvg(url, tagQrOptions(DEFAULT_QR_STYLE, "abcd2345efgh"))).toBe(
      renderQrSvg(url, { logoHref: LOGO_DATA_URI, label: "abcd2345efgh" }),
    );
  });
});

describe("tagQrOptions", () => {
  test("maps each switch to a render option and always labels the code with the id", () => {
    expect(tagQrOptions({ logo: true, dots: true }, "x")).toEqual({ logoHref: LOGO_DATA_URI, dots: true, label: "x" });
    expect(tagQrOptions({ logo: false, dots: true }, "x")).toEqual({ logoHref: undefined, dots: true, label: "x" });
    expect(tagQrOptions({ logo: true, dots: false }, "x")).toEqual({ logoHref: LOGO_DATA_URI, dots: false, label: "x" });
    expect(tagQrOptions({ logo: false, dots: false }, "x")).toEqual({ logoHref: undefined, dots: false, label: "x" });
  });

  test("the four combinations give four different codes", () => {
    const outputs = [true, false].flatMap((logo) =>
      [true, false].map((dots) => renderQrSvg(url, tagQrOptions({ logo, dots }, "abcd2345efgh"))),
    );
    expect(new Set(outputs).size).toBe(4);
    const [both, noDots, noLogo, neither] = [outputs[0], outputs[1], outputs[2], outputs[3]];
    expect(both).toContain("<image");
    expect(both).toContain('r="0.42"');
    expect(noDots).toContain("<image");
    expect(noDots).not.toContain('r="0.42"');
    expect(noLogo).not.toContain("<image");
    expect(noLogo).toContain('r="0.42"');
    expect(neither).not.toContain("<image");
    expect(neither).not.toContain("<circle");
  });
});
