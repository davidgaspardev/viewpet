import { describe, expect, test } from "bun:test";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Tooltip } from "@/ui/Tooltip";
import type { Guardian, Pet } from "@/types/pet";
import { GuardianContact } from "../components/GuardianContact";
import { LostBanner } from "../components/LostBanner";

type TooltipProps = { defaultOpen?: boolean; closable?: boolean };

/**
 * The props of every `Tooltip` in the tree, in order. A server render can't
 * show which hint opens on load (that happens after mount), so this walks the
 * element tree instead, calling the plain function components on the way and
 * stopping at `Tooltip` (which uses hooks).
 */
function tooltipsIn(node: ReactNode): TooltipProps[] {
  const found: TooltipProps[] = [];
  const visit = (n: ReactNode): void => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (!isValidElement(n)) return;
    const element = n as ReactElement<{ children?: ReactNode }>;
    if (element.type === Tooltip) {
      found.push(element.props as TooltipProps);
    } else if (typeof element.type === "function") {
      visit((element.type as (props: unknown) => ReactNode)(element.props));
    } else {
      visit(element.props.children);
    }
  };
  visit(node);
  return found;
}

/**
 * Whether any list of sibling elements in the tree has two with the same key
 * (React drops or duplicates rows then). Server rendering doesn't warn about
 * that, so look at the keys directly. Expands plain function components, and
 * stops at `Tooltip` (hooks).
 */
function hasDuplicateSiblingKeys(node: ReactNode): boolean {
  if (Array.isArray(node)) {
    const keys = node.filter(isValidElement).map((child) => child.key).filter((key) => key !== null);
    if (new Set(keys).size !== keys.length) return true;
    return node.some(hasDuplicateSiblingKeys);
  }
  if (!isValidElement(node)) return false;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === Tooltip) return false;
  if (typeof element.type === "function") {
    return hasDuplicateSiblingKeys((element.type as (props: unknown) => ReactNode)(element.props));
  }
  return hasDuplicateSiblingKeys(element.props.children);
}

const guardian = (phones: Guardian["phones"], name = "Ana Souza"): Guardian => ({
  name,
  phones,
  social: {},
});

describe("GuardianContact phones", () => {
  test("a single number keeps the plain label and its buttons", () => {
    const html = renderToStaticMarkup(
      <GuardianContact
        locale="pt-BR"
        guardians={[guardian([{ e164: "5548981234567", display: "(48) 98123-4567", channels: ["call", "whatsapp"] }])]}
      />,
    );
    expect(html).toContain(">Celular<");
    expect(html).not.toContain("Celular principal");
    expect(html).toContain('href="https://wa.me/5548981234567"');
    expect(html).toContain('href="tel:+5548981234567"');
    expect(html).not.toContain("t.me");
  });

  test("a Telegram number gets a Telegram button that opens the chat by number", () => {
    const html = renderToStaticMarkup(
      <GuardianContact
        locale="pt-BR"
        guardians={[guardian([{ e164: "5548981234567", display: "(48) 98123-4567", channels: ["telegram"] }])]}
      />,
    );
    expect(html).toContain('href="https://t.me/+5548981234567"');
    expect(html).toContain('aria-label="Abrir Telegram"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("tel:");
  });

  test("several numbers: the first is the main one, in order, each with its own buttons", () => {
    const html = renderToStaticMarkup(
      <GuardianContact
        locale="pt-BR"
        guardians={[
          guardian([
            { e164: "5548981111111", display: "(48) 98111-1111", channels: ["call"] },
            { e164: "5548982222222", display: "(48) 98222-2222", channels: ["whatsapp", "telegram"] },
            { e164: "5548983333333", display: "(48) 98333-3333", channels: ["call", "whatsapp", "telegram"] },
          ]),
        ]}
      />,
    );
    const main = html.indexOf("Celular principal");
    const second = html.indexOf("Celular 2");
    const third = html.indexOf("Celular 3");
    expect(main).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(main);
    expect(third).toBeGreaterThan(second);

    // Buttons stay with their own number.
    const row2 = html.slice(second, third);
    expect(row2).toContain("wa.me/5548982222222");
    expect(row2).toContain("t.me/+5548982222222");
    expect(row2).not.toContain("tel:");
    expect(html.slice(main, second)).toContain("tel:+5548981111111");
    expect(html.slice(third)).toContain("t.me/+5548983333333");
  });

  test("each number with the call channel gets its own call button", () => {
    const html = renderToStaticMarkup(
      <GuardianContact
        locale="pt-BR"
        guardians={[
          guardian([
            { e164: "5548981111111", channels: ["whatsapp"] },
            { e164: "5548982222222", channels: ["call"] },
            { e164: "5548983333333", channels: ["call"] },
          ]),
        ]}
      />,
    );
    expect(html.match(/href="tel:/g)).toHaveLength(2);
  });

  test("only the first call button of a guardian opens its hint on load, and only that one can be dismissed", () => {
    const tooltips = tooltipsIn(
      <GuardianContact
        locale="pt-BR"
        guardians={[
          guardian([
            { e164: "5548981111111", channels: ["whatsapp"] }, // no call button at all
            { e164: "5548982222222", channels: ["call"] },
            { e164: "5548983333333", channels: ["call"] },
          ]),
        ]}
      />,
    );
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toMatchObject({ defaultOpen: true, closable: true });
    // A hover/focus tooltip has no reachable close button — it must not render one.
    expect(tooltips[1]).toMatchObject({ defaultOpen: false, closable: false });
  });

  test("each guardian keeps its own opening hint, as with a single number", () => {
    const tooltips = tooltipsIn(
      <GuardianContact
        locale="pt-BR"
        guardians={[
          guardian([{ e164: "5548981111111", channels: ["call"] }]),
          guardian([{ e164: "5511977777777", channels: ["call"] }], "Outro"),
        ]}
      />,
    );
    expect(tooltips.map((t) => t.defaultOpen)).toEqual([true, true]);
  });

  test("a number repeated in stored data still gets distinct row keys, and both rows render", () => {
    const repeated = [
      guardian([
        { e164: "5548981111111", channels: ["call"] },
        { e164: "5548981111111", channels: ["whatsapp"] },
      ]),
    ];
    expect(hasDuplicateSiblingKeys(<GuardianContact locale="pt-BR" guardians={repeated} />)).toBe(false);

    const html = renderToStaticMarkup(<GuardianContact locale="pt-BR" guardians={repeated} />);
    expect(html).toContain("tel:+5548981111111");
    expect(html).toContain("wa.me/5548981111111");
  });
});

function lostPet(guardians: Guardian[]): Pet {
  return { name: "Thor", pictureUrl: "/x.jpg", birthdate: "2020-01-01T00:00:00.000Z", status: "lost", guardians };
}

describe("LostBanner secondary links", () => {
  test("lists Telegram next to WhatsApp, separated, and links the right number", () => {
    const html = renderToStaticMarkup(
      <LostBanner
        locale="pt-BR"
        pet={lostPet([
          guardian([
            { e164: "5548981111111", channels: ["call", "whatsapp"] },
            { e164: "5548982222222", channels: ["telegram"] },
          ]),
        ])}
      />,
    );
    expect(html).toContain('href="tel:+5548981111111"');
    expect(html).toContain('href="https://wa.me/5548981111111"');
    expect(html).toContain('href="https://t.me/+5548982222222"');
    expect(html.match(/·/g)).toHaveLength(1);
  });

  test("with every option there are two separators; with none there is no row", () => {
    const all = renderToStaticMarkup(
      <LostBanner
        locale="en-US"
        pet={lostPet([
          guardian([{ e164: "5548981111111", channels: ["call", "whatsapp", "telegram"] }]),
          guardian([{ e164: "5548984444444", channels: ["call"] }], "Outro"),
        ])}
      />,
    );
    expect(all).toContain("Telegram");
    expect(all).toContain('href="#guardians"');
    expect(all.match(/·/g)).toHaveLength(2);

    const none = renderToStaticMarkup(
      <LostBanner
        locale="en-US"
        pet={lostPet([guardian([{ e164: "5548981111111", channels: ["call"] }])])}
      />,
    );
    expect(none).not.toContain("·");
    expect(none).not.toContain("t.me");
  });
});
