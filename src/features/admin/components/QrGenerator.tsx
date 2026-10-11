"use client";

import { useState, useTransition } from "react";

import { generateQr, type GeneratedQr } from "../actions";

const ERRORS: Record<string, string> = {
  unauthorized: "Not authorized.",
  generation_failed: "Could not reserve a free id. Try again.",
};

function downloadSvg({ id, svg }: GeneratedQr) {
  const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `viewpet-${id}.svg`;
  link.click();
  URL.revokeObjectURL(href);
}

export function QrGenerator() {
  const [history, setHistory] = useState<GeneratedQr[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = history[0];

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateQr();
        if (result.status === "success") {
          setHistory((prev) => [result.qr, ...prev]);
        } else {
          setError(ERRORS[result.message] ?? "Something went wrong.");
        }
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className="rounded-xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate new QR code"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {current && (
        <section className="space-y-3">
          <div
            className="w-full max-w-xs rounded-xl border border-black/10 p-2 [&_svg]:h-auto [&_svg]:w-full"
            // Markup is produced server-side by renderQrSvg from our own data.
            dangerouslySetInnerHTML={{ __html: current.svg }}
          />
          <p className="font-mono text-sm">{current.id}</p>
          <a href={current.url} className="block break-all text-sm underline" target="_blank" rel="noreferrer">
            {current.url}
          </a>
          <button
            type="button"
            onClick={() => downloadSvg(current)}
            className="rounded-xl border border-black/20 px-4 py-2 text-sm font-semibold"
          >
            Download SVG
          </button>
        </section>
      )}

      {history.length > 1 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Generated this session</h2>
          <ul className="space-y-1 text-sm">
            {history.map((qr) => (
              <li key={qr.id} className="flex items-center gap-3">
                <span className="font-mono">{qr.id}</span>
                <button type="button" onClick={() => downloadSvg(qr)} className="underline">
                  SVG
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
