"use client";

import { memo, useEffect, useState } from "react";

import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";
import type { PetEntrySummaryItem } from "@/lib/repository";
import type { PetStatus } from "@/types/pet";
import { Card } from "@/ui/Card";

import { STATUS_LABELS } from "../entries";
import { qrUrl } from "../origin";
import { outlineButton } from "../styles";

const BADGE_COLORS: Record<PetStatus, string> = {
  reserved: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
};

const tagQrSvg = (url: string, id: string) => renderQrSvg(url, { logoHref: LOGO_DATA_URI, label: id });

function downloadSvg(id: string, svg: string) {
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

type PetQrCardProps = {
  entry: PetEntrySummaryItem;
  /** URL prefix the QR encodes; the id is appended. */
  qrBase: string;
};

/**
 * One pet id with its status and QR code. The QR is a pure function of the
 * public URL, so it is rendered here from the id instead of being stored.
 */
export const PetQrCard = memo(function PetQrCard({ entry, qrBase }: PetQrCardProps) {
  const url = qrUrl(qrBase, entry.id);

  // Computed after mount, not during render: each QR is ~50 KB of markup, so
  // doing it in render would put it in the server HTML and then again on
  // hydration. An <img> keeps the card at one DOM node (the inline SVG has
  // ~600) and means the markup is never injected into the page.
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(tagQrSvg(url, entry.id))}`);
  }, [url, entry.id]);

  return (
    <Card
      title={entry.id}
      headerAction={
        <button
          type="button"
          // Rendered on demand so the card doesn't keep the SVG around as well.
          onClick={() => downloadSvg(entry.id, tagQrSvg(url, entry.id))}
          className={`mr-2 rounded-lg px-3 py-1.5 text-xs ${outlineButton}`}
        >
          Download SVG
        </button>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${BADGE_COLORS[entry.status]}`}
        >
          {STATUS_LABELS[entry.status]}
        </span>
        {entry.name ? <span className="truncate text-xs text-muted">{entry.name}</span> : null}
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URI, nothing for next/image to optimise
        <img src={src} alt={`QR code ${entry.id}`} className="h-auto w-full rounded-lg bg-white p-2" />
      ) : (
        <div aria-hidden className="aspect-[15/16] w-full rounded-lg bg-white" />
      )}
      <a href={url} className="block break-all text-xs text-muted underline" target="_blank" rel="noreferrer">
        {url}
      </a>
    </Card>
  );
});
