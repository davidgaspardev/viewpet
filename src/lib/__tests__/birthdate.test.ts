import { describe, expect, test } from "bun:test";
import {
  applyDateMask,
  caretAfterMask,
  formatBirthdateLong,
  localTodayIso,
  MAX_PET_AGE_YEARS,
  parseMaskedBirthdate,
  tomorrowUtcIso,
  validateBirthdate,
  validateBirthdateIso,
} from "../utils/birthdate";

const TODAY = "2026-10-11";

describe("applyDateMask", () => {
  test("inserts slashes progressively", () => {
    expect(applyDateMask("")).toBe("");
    expect(applyDateMask("2")).toBe("2");
    expect(applyDateMask("21")).toBe("21");
    expect(applyDateMask("210")).toBe("21/0");
    expect(applyDateMask("2104")).toBe("21/04");
    expect(applyDateMask("21042")).toBe("21/04/2");
    expect(applyDateMask("21042018")).toBe("21/04/2018");
  });

  test("keeps only digits and caps at 8", () => {
    expect(applyDateMask("21/04/2018")).toBe("21/04/2018");
    expect(applyDateMask("21-04-2018 x")).toBe("21/04/2018");
    expect(applyDateMask("210420189999")).toBe("21/04/2018");
    expect(applyDateMask("abc")).toBe("");
  });

  test("is idempotent (backspacing over a slash re-masks cleanly)", () => {
    expect(applyDateMask(applyDateMask("21042018"))).toBe("21/04/2018");
    expect(applyDateMask("21/")).toBe("21");
    for (const typed of ["5/4/2018", "21/04", "2", "21/0", "1/", "2018-04-21", "21 / 04 / 2018"]) {
      const once = applyDateMask(typed);
      expect(applyDateMask(once)).toBe(once);
    }
  });

  test("a separator after a lone digit zero-pads it", () => {
    expect(applyDateMask("5/")).toBe("05");
    expect(applyDateMask("5/4/2018")).toBe("05/04/2018");
    expect(applyDateMask("5-4-2018")).toBe("05/04/2018");
    expect(applyDateMask("5.4.2018")).toBe("05/04/2018");
    expect(applyDateMask("21/4/2018")).toBe("21/04/2018");
    expect(applyDateMask("10/5/2018")).toBe("10/05/2018");
  });

  test("separators that carry no information are ignored", () => {
    expect(applyDateMask("/")).toBe("");
    expect(applyDateMask("21//04")).toBe("21/04");
    expect(applyDateMask("0/")).toBe("0"); // a lone zero is not padded into "00"
    expect(applyDateMask("21/04/2018/")).toBe("21/04/2018");
  });

  test("tolerates spaces around separators (pasted text)", () => {
    expect(applyDateMask("21 / 04 / 2018")).toBe("21/04/2018");
    expect(applyDateMask(" 21/04/2018 ")).toBe("21/04/2018");
    expect(applyDateMask("21/04/2018\n")).toBe("21/04/2018");
  });

  test("reorders a complete ISO date (pasted) to day-first", () => {
    expect(applyDateMask("2018-04-21")).toBe("21/04/2018");
    expect(applyDateMask(" 2018-04-21 ")).toBe("21/04/2018");
  });
});

describe("caretAfterMask", () => {
  test("typing at the end keeps the caret at the end", () => {
    expect(caretAfterMask("21/04", 5, "21/04")).toBe(5);
    expect(caretAfterMask("210", 3, "21/0")).toBe(4);
  });

  test("editing in the middle keeps the caret after the same digit", () => {
    // "21/04/2018" with the month's "4" deleted: raw "21/0/2018", caret after "21/0"
    expect(caretAfterMask("21/0/2018", 4, "21/02/018")).toBe(4);
    // inserting a digit before the year: caret stays after the typed digit
    expect(caretAfterMask("21/04/92018", 7, "21/04/9201")).toBe(7);
  });

  test("a caret before every digit goes to the start", () => {
    expect(caretAfterMask("21/04/2018", 0, "21/04/2018")).toBe(0);
    expect(caretAfterMask("/21", 1, "21")).toBe(0);
  });

  test("falls back to the end when extra digits were dropped by the mask", () => {
    // 10 digits typed, the mask keeps 8: a caret after the 9th digit lands at the end
    expect(caretAfterMask("2104201899", 9, "21/04/2018")).toBe(10);
  });
});

describe("formatBirthdateLong", () => {
  test("spells the date out for the locale, independent of the machine timezone", () => {
    expect(formatBirthdateLong("2018-04-21", "en-US")).toBe("April 21, 2018");
    expect(formatBirthdateLong("2018-04-21", "pt-BR")).toBe("21 de abril de 2018");
    expect(formatBirthdateLong("2020-02-29", "pt-BR")).toBe("29 de fevereiro de 2020");
  });
});

describe("parseMaskedBirthdate", () => {
  test("accepts a real past date and returns ISO", () => {
    expect(parseMaskedBirthdate("21/04/2018", TODAY)).toEqual({ ok: true, iso: "2018-04-21" });
  });

  test("accepts today and rejects tomorrow", () => {
    expect(parseMaskedBirthdate("11/10/2026", TODAY)).toEqual({ ok: true, iso: "2026-10-11" });
    expect(parseMaskedBirthdate("12/10/2026", TODAY)).toEqual({ ok: false, error: "future" });
  });

  test("flags incomplete input", () => {
    expect(parseMaskedBirthdate("", TODAY)).toEqual({ ok: false, error: "incomplete" });
    expect(parseMaskedBirthdate("21/04/20", TODAY)).toEqual({ ok: false, error: "incomplete" });
  });

  test("rejects dates that don't exist", () => {
    for (const bad of ["31/02/2020", "00/10/2020", "32/01/2020", "15/13/2020", "29/02/2019"]) {
      expect(parseMaskedBirthdate(bad, TODAY)).toEqual({ ok: false, error: "invalid" });
    }
  });

  test("handles leap days", () => {
    expect(parseMaskedBirthdate("29/02/2020", TODAY)).toEqual({ ok: true, iso: "2020-02-29" });
  });

  test("rejects absurdly old dates but accepts the oldest allowed year", () => {
    const limitYear = 2026 - MAX_PET_AGE_YEARS;
    expect(parseMaskedBirthdate(`01/01/${limitYear - 1}`, TODAY)).toEqual({ ok: false, error: "too_old" });
    expect(parseMaskedBirthdate(`01/01/${limitYear}`, TODAY).ok).toBe(true);
    expect(parseMaskedBirthdate("01/01/0001", TODAY)).toEqual({ ok: false, error: "too_old" });
    expect(parseMaskedBirthdate("01/01/0000", TODAY)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("validateBirthdate", () => {
  test("rejects non-integers", () => {
    expect(validateBirthdate(1.5, 1, 2020, TODAY)).toEqual({ ok: false, error: "invalid" });
    expect(validateBirthdate(NaN, 1, 2020, TODAY)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("validateBirthdateIso", () => {
  test("accepts a strict YYYY-MM-DD", () => {
    expect(validateBirthdateIso("2018-04-21", TODAY)).toEqual({ ok: true, iso: "2018-04-21" });
  });

  test("rejects other shapes, even ones Date can parse", () => {
    for (const bad of ["", "2018", "2018-4-21", "21/04/2018", "2018-04-21T00:00:00Z", "April 21 2018", " 2018-04-21"]) {
      expect(validateBirthdateIso(bad, TODAY)).toEqual({ ok: false, error: "invalid" });
    }
  });

  test("rejects impossible, future and ancient dates", () => {
    expect(validateBirthdateIso("2018-02-30", TODAY).ok).toBe(false);
    expect(validateBirthdateIso("2026-10-12", TODAY)).toEqual({ ok: false, error: "future" });
    expect(validateBirthdateIso("1900-01-01", TODAY)).toEqual({ ok: false, error: "too_old" });
  });
});

describe("date helpers", () => {
  test("localTodayIso uses the local calendar date, zero-padded", () => {
    expect(localTodayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localTodayIso(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  test("tomorrowUtcIso rolls over month and year boundaries", () => {
    expect(tomorrowUtcIso(new Date(Date.UTC(2026, 9, 11, 12)))).toBe("2026-10-12");
    expect(tomorrowUtcIso(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toBe("2027-01-01");
    expect(tomorrowUtcIso(new Date(Date.UTC(2028, 1, 28)))).toBe("2028-02-29");
  });

  test("a user already on 'tomorrow' (UTC+13) can still submit their today", () => {
    const serverNow = new Date(Date.UTC(2026, 9, 11, 20, 0)); // 21:00 UTC → 10:00 next day in UTC+13
    const usersToday = "2026-10-12";
    expect(validateBirthdateIso(usersToday, tomorrowUtcIso(serverNow)).ok).toBe(true);
    expect(validateBirthdateIso("2026-10-13", tomorrowUtcIso(serverNow))).toEqual({ ok: false, error: "future" });
  });
});
