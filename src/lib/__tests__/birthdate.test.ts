import { describe, expect, test } from "bun:test";
import {
  AGE_BIRTHDATE_MARGIN_DAYS,
  applyDateMask,
  birthdateFromAge,
  MAX_AGE_MONTHS,
  caretAfterMask,
  formatBirthdateLong,
  localTodayIso,
  MAX_PET_AGE_YEARS,
  parseMaskedBirthdate,
  tomorrowUtcIso,
  validateBirthdate,
  validateBirthdateIso,
} from "../utils/birthdate";
import { ageInMonths } from "../utils/age";

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

describe("birthdateFromAge", () => {
  const born = (months: number, today: string) => {
    const result = birthdateFromAge(months, today);
    if (!result.ok) throw new Error(`expected a date, got ${result.error}`);
    return result.iso;
  };

  test("is the same day N months ago, minus the margin", () => {
    expect(AGE_BIRTHDATE_MARGIN_DAYS).toBe(3);
    expect(born(3, "2026-10-11")).toBe("2026-07-08");
    expect(born(1, "2026-10-11")).toBe("2026-09-08");
  });

  test("years and months are the same thing: 33 months is 2 years and 9 months", () => {
    expect(born(33, "2026-10-11")).toBe("2024-01-08");
    expect(born(2 * 12 + 9, "2026-10-11")).toBe(born(33, "2026-10-11"));
  });

  test("crosses year boundaries", () => {
    expect(born(3, "2026-01-20")).toBe("2025-10-17");
    expect(born(12, "2026-01-20")).toBe("2025-01-17");
  });

  test("the margin rolls back over month and year starts", () => {
    expect(born(3, "2026-10-02")).toBe("2026-06-29");
    expect(born(12, "2026-01-01")).toBe("2024-12-29");
  });

  test("clamps to the last day of a shorter month instead of spilling into the next", () => {
    // 31 May − 3 months: there is no 31 February → 28 February (2026), then −3 days.
    expect(born(3, "2026-05-31")).toBe("2026-02-25");
    // …a leap year keeps its 29th…
    expect(born(3, "2028-05-31")).toBe("2028-02-26");
    // …and 29 February a year back clamps to 28 February.
    expect(born(12, "2028-02-29")).toBe("2027-02-25");
  });

  test("the age the profile shows is the age the tutor typed, on the day and a day either side", () => {
    // formatAge reads the stored date as UTC midnight; a viewer (or the server) may be a day off.
    for (const months of [1, 3, 11, 12, 33, 100]) {
      for (const day of ["2026-03-31", "2026-05-31", "2026-10-11", "2026-12-31"]) {
        const iso = born(months, day);
        for (const offset of [-1, 0, 1]) {
          const now = new Date(`${day}T12:00:00Z`);
          now.setUTCDate(now.getUTCDate() + offset);
          const shown = ageInMonths(new Date(`${iso}T00:00:00Z`), now);
          // Never younger than said; at most the margin's worth older.
          expect(shown).toBeGreaterThanOrEqual(months);
          expect(shown).toBeLessThanOrEqual(months + 1);
        }
      }
    }
  });

  test("always passes the same check the server applies to a typed date", () => {
    for (const months of [1, 7, 12, 33, MAX_AGE_MONTHS]) {
      for (const today of ["2026-01-01", "2026-02-28", "2028-02-29", "2026-12-31"]) {
        const iso = born(months, today);
        expect(validateBirthdateIso(iso, tomorrowUtcIso(new Date(`${today}T12:00:00Z`)))).toEqual({
          ok: true,
          iso,
        });
      }
    }
  });

  test("less than a month, zero or a non-integer is too young; past the cap is too old", () => {
    for (const months of [0, -1, 1.5, Number.NaN]) {
      expect(birthdateFromAge(months, "2026-10-11")).toEqual({ ok: false, error: "too_young" });
    }
    expect(birthdateFromAge(MAX_AGE_MONTHS + 1, "2026-10-11")).toEqual({ ok: false, error: "too_old" });
    expect(birthdateFromAge(MAX_AGE_MONTHS, "2026-10-11").ok).toBe(true);
  });
});
