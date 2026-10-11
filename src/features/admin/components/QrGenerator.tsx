"use client";

import { useState, useTransition } from "react";

import { Card } from "@/ui/Card";

import { generateQr, type GeneratedQr, type GenerateQrResult } from "../actions";

type ErrorCode = Extract<GenerateQrResult, { status: "error" }>["message"];

const ERRORS: Record<ErrorCode, string> = {
  unauthorized: "Not authorized.",
  invalid_site_url: "SITE_URL is not a valid http(s) URL. Fix the server configuration.",
  generation_failed: "Could not reserve a free id. Try again.",
};

function downloadSvg({ id, svg }: GeneratedQr) {
  const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `viewpet-${id}.svg`;
  // Attached while clicking (Firefox), and revoked late: Safari starts the
  // download asynchronously, so an immediate revoke can cancel it.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

function QrCard({ qr }: { qr: GeneratedQr }) {
  return (
    <div className="w-72">
      <Card
        title={qr.id}
        headerAction={
          <button
            type="button"
            onClick={() => downloadSvg(qr)}
            className="mr-2 rounded-lg border border-black/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/5"
          >
            Download SVG
          </button>
        }
      >
        <div
          className="rounded-lg bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
          // Markup is produced server-side by renderQrSvg from our own data.
          dangerouslySetInnerHTML={{ __html: qr.svg }}
        />
        <a href={qr.url} className="block break-all text-xs text-muted underline" target="_blank" rel="noreferrer">
          {qr.url}
        </a>
      </Card>
    </div>
  );
}

export function QrGenerator() {
  const [history, setHistory] = useState<GeneratedQr[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateQr();
        if (result.status === "success") {
          setHistory((prev) => [result.qr, ...prev]);
        } else {
          setError(ERRORS[result.message]);
        }
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <>
      {history.length === 0 ? (
        <p className="text-sm text-muted">No QR codes generated yet. Use the button at the bottom right.</p>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {history.map((qr) => (
            <li key={qr.id}>
              <QrCard qr={qr} />
            </li>
          ))}
        </ul>
      )}

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {error && (
          <p role="alert" className="rounded-lg bg-white px-3 py-2 text-sm text-red-600 shadow-lg">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="rounded-full bg-ink px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate new QR code"}
        </button>
      </div>
    </>
  );
}
