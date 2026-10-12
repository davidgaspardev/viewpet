"use client";

import { memo, useMemo, useState, useTransition } from "react";

import { Card } from "@/ui/Card";
import { useSnackbar } from "@/ui/Snackbar";

import { generateQr, type GeneratedQr, type GenerateQrResult } from "../actions";

type ErrorCode = Extract<GenerateQrResult, { status: "error" }>["message"];

const ERRORS: Record<ErrorCode, string> = {
  unauthorized: "Not authorized.",
  invalid_site_url: "SITE_URL is not a valid http(s) URL. Fix the server configuration.",
  invalid_qr_base_url: "QR_BASE_URL is not a valid http(s) URL. Fix the server configuration.",
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

const QrCard = memo(function QrCard({ qr }: { qr: GeneratedQr }) {
  // An <img> keeps each card at one DOM node (the inline SVG has ~600) and
  // means no server-produced markup is ever injected into the page.
  const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`, [qr.svg]);

  return (
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
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, nothing for next/image to optimise */}
      <img src={src} alt={`QR code ${qr.id}`} className="h-auto w-full rounded-lg bg-white p-2" />
      <a href={qr.url} className="block break-all text-xs text-muted underline" target="_blank" rel="noreferrer">
        {qr.url}
      </a>
    </Card>
  );
});

export function QrGenerator() {
  const [history, setHistory] = useState<GeneratedQr[]>([]);
  const [pending, startTransition] = useTransition();
  const { show } = useSnackbar();

  function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await generateQr();
        if (result.status === "success") {
          setHistory((prev) => [result.qr, ...prev]);
          show(`Reserved ${result.qr.id}`, { variant: "info" });
        } else {
          show(ERRORS[result.message], { variant: "error" });
        }
      } catch {
        show("Something went wrong.", { variant: "error" });
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
            <li key={qr.id} className="w-72">
              <QrCard qr={qr} />
            </li>
          ))}
        </ul>
      )}

      <div className="fixed bottom-6 right-6 z-40">
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
