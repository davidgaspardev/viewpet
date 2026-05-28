"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

const ACCEPTED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const MAX_BYTES = 5 * 1024 * 1024;

type ImageUploadProps = {
  name: string;
  required?: boolean;
  locale: Locale;
};

type LocalError = "type" | "size" | null;

export function ImageUpload({
  name,
  required = false,
  locale,
}: ImageUploadProps) {
  const dict = getDictionary(locale);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [error, setError] = useState<LocalError>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Free the object URL when it changes or the component unmounts.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const validate = (file: File): LocalError => {
    if (!ACCEPTED_MIMES.includes(file.type as (typeof ACCEPTED_MIMES)[number])) {
      return "type";
    }
    if (file.size > MAX_BYTES) {
      return "size";
    }
    return null;
  };

  const setFromFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validate(file);
    if (err) {
      setError(err);
      setPreviewUrl(null);
      setPreviewName(null);
      // Reset both inputs so the user can pick another file.
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      return;
    }
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewName(file.name);
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFromFiles(e.target.files);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!fileInputRef.current) return;
    // Stuff the dropped files into the actual <input type=file> so they
    // travel with the form submission as expected by the Server Action.
    const dt = new DataTransfer();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    dt.items.add(files[0]);
    fileInputRef.current.files = dt.files;
    setFromFiles(dt.files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onRemove = () => {
    setPreviewUrl(null);
    setPreviewName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const errorMessage =
    error === "type"
      ? dict.errorPictureType
      : error === "size"
        ? dict.errorPictureSize
        : null;

  return (
    <div className="w-full min-w-0">
      <span className="text-xs font-medium text-muted">
        {dict.petPicture}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {/* The single source of truth for the form submission. Hidden but
          actually focusable via the dropzone label. */}
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept={ACCEPTED_MIMES.join(",")}
        required={required && !previewUrl}
        onChange={onChange}
        className="sr-only"
      />
      {/* Mobile camera capture funnels into the same input via the
          DataTransfer trick on change. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const files = e.target.files;
          if (!files || files.length === 0 || !fileInputRef.current) return;
          const dt = new DataTransfer();
          dt.items.add(files[0]);
          fileInputRef.current.files = dt.files;
          setFromFiles(dt.files);
        }}
        className="sr-only"
      />

      {!previewUrl ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`mt-1 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDragging
              ? "border-ink bg-ink/5"
              : "border-black/15 bg-white"
          }`}
        >
          <UploadIcon />
          <p className="text-sm font-medium text-ink">
            {dict.petPictureDropzone}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40 hover:bg-ink/5"
            >
              <GalleryIcon />
              {dict.petPictureBrowseBtn}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40 hover:bg-ink/5"
            >
              <CameraIcon />
              {dict.petPictureCamera}
            </button>
          </div>
          <p className="text-[11px] text-muted">{dict.petPictureHint}</p>
        </div>
      ) : (
        <div className="mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white">
          {/* Local preview only — file isn't uploaded until the form submits. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={previewName ?? ""}
            className="block aspect-square w-full object-cover"
          />
          <div className="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3">
            <p className="truncate text-xs text-muted">{previewName}</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/40 hover:bg-ink/5"
              >
                {dict.petPictureReplace}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
              >
                {dict.petPictureRemove}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink/70"
      aria-hidden
    >
      <path d="M12 16V4" />
      <path d="m6 10 6-6 6 6" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 4h-5l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5l-2-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
