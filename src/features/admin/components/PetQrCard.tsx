"use client";

import { memo, useMemo } from "react";

import { LOGO_DATA_URI } from "@/lib/qrcode/logo";
import { renderQrSvg } from "@/lib/qrcode/render";
import type { PetEntrySummaryItem } from "@/lib/repository";
import type { PetStatus } from "@/types/pet";
import { Card } from "@/ui/Card";

import { petUrl } from "../entries";

const BADGES: Record<PetStatus, { label: string; className: string }> = {
  reserved: { label: "Reserved", className: "bg-amber-100 text-amber-800" },
  active: { label: "Active", className: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", className: "bg-red-100 text-red-800" },
};

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
  origin: string;
};

/**
 * One pet id with its status and QR code. The QR is a pure function of the
 * public URL, so it is rendered here from the id instead of being stored.
 */
export const PetQrCard = memo(function PetQrCard({ entry, origin }: PetQrCardProps) {
  const url = petUrl(origin, entry.id);
  const svg = useMemo(() => renderQrSvg(url, { logoHref: LOGO_DATA_URI, label: entry.id }), [url, entry.id]);
  // An <img> keeps each card at one DOM node (the inline SVG has ~600) and
  // means the markup is never injected into the page.
  const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);
  const badge = BADGES[entry.status];

  return (
    <Card
      title={entry.id}
      headerAction={
        <button
          type="button"
          onClick={() => downloadSvg(entry.id, svg)}
          className="mr-2 rounded-lg border border-black/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/5"
        >
          Download SVG
        </button>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
        {entry.name ? <span className="truncate text-xs text-muted">{entry.name}</span> : null}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, nothing for next/image to optimise */}
      <img src={src} alt={`QR code ${entry.id}`} className="h-auto w-full rounded-lg bg-white p-2" />
      <a href={url} className="block break-all text-xs text-muted underline" target="_blank" rel="noreferrer">
        {url}
      </a>
    </Card>
  );
});
