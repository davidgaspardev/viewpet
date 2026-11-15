import { describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SnackbarProvider } from "@/ui/Snackbar";

import { QrGenerator } from "../components/QrGenerator";
import { Switch } from "../components/Switch";

describe("Switch", () => {
  test("is a switch named by its label, whose state follows `checked`", () => {
    const on = renderToStaticMarkup(<Switch label="Round dots" checked onChange={() => {}} />);
    const off = renderToStaticMarkup(<Switch label="Round dots" checked={false} onChange={() => {}} />);
    expect(on).toContain('role="switch"');
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain("Round dots");
    expect(off).toContain('aria-checked="false"');
  });

  test("a click asks for the opposite of the current state", () => {
    const calls: boolean[] = [];
    const onChange = (checked: boolean) => calls.push(checked);
    const click = (checked: boolean) =>
      (Switch({ label: "x", checked, onChange }) as ReactElement<{ onClick: () => void }>).props.onClick();
    click(true);
    click(false);
    expect(calls).toEqual([false, true]);
  });
});

describe("QrGenerator switches", () => {
  const html = renderToStaticMarkup(
    <SnackbarProvider closeLabel="Close" placement="left">
      <QrGenerator initialEntries={[{ id: "abcd2345efgh", status: "active" }]} qrBase="https://viewpet.example/tag/" />
    </SnackbarProvider>,
  );

  test("has the logo and dots switches, both on by default", () => {
    const switches = [...html.matchAll(/<button[^>]*role="switch"[^>]*aria-checked="(\w+)"[^>]*>.*?<\/button>/g)];
    expect(switches.map((m) => m[1])).toEqual(["true", "true"]);
    expect(html).toContain("Logo in the middle");
    expect(html).toContain("Round dots");
  });

  test("sits in the same row as the status filters", () => {
    const row = html.slice(html.indexOf("justify-between"), html.indexOf("<ul"));
    expect(row).toContain('aria-label="Filter by status"');
    expect(row).toContain('aria-label="QR code style"');
  });
});
