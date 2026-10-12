"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AlertCircleIcon, AlertTriangleIcon, InfoCircleIcon, XIcon } from "@/ui/icons";

import {
  addSnackbar,
  removeSnackbar,
  resolveDuration,
  type SnackbarItem,
  type SnackbarVariant,
} from "./snackbar.state";

type ShowOptions = {
  /** Defaults to "info". */
  variant?: SnackbarVariant;
  /**
   * Auto-dismiss delay in ms; `null` (or a non-finite number) keeps it until
   * dismissed. Defaults per variant: info and warn time out, errors persist.
   */
  duration?: number | null;
};

type SnackbarApi = {
  /** Shows a snackbar and returns its id. */
  show: (message: string, options?: ShowOptions) => string;
  dismiss: (id: string) => void;
};

const SnackbarContext = createContext<SnackbarApi | null>(null);

export function useSnackbar(): SnackbarApi {
  const api = useContext(SnackbarContext);
  if (!api) throw new Error("useSnackbar must be used inside <SnackbarProvider>");
  return api;
}

const STYLES: Record<SnackbarVariant, { box: string; Icon: typeof InfoCircleIcon }> = {
  info: { box: "bg-ink text-white", Icon: InfoCircleIcon },
  warn: { box: "bg-amber-400 text-ink", Icon: AlertTriangleIcon },
  error: { box: "bg-red-600 text-white", Icon: AlertCircleIcon },
};

type Placement = "center" | "left";

const PLACEMENT: Record<Placement, string> = {
  center: "inset-x-4 mx-auto max-w-md",
  left: "left-4 right-4 max-w-md sm:left-6",
};

type SnackbarProviderProps = {
  children: React.ReactNode;
  /** Accessible name of the dismiss button — the localized word for "Close". */
  closeLabel: string;
  /** Bottom-centre by default; "left" keeps clear of a floating action at the right. */
  placement?: Placement;
};

/**
 * Provides `useSnackbar()` to its subtree and renders the stack at the bottom
 * of the viewport. Info and warn messages go to a polite live region, errors
 * to an assertive one, so screen readers announce each appropriately.
 */
export function SnackbarProvider({ children, closeLabel, placement = "center" }: SnackbarProviderProps) {
  const [items, setItems] = useState<SnackbarItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, { variant = "info", duration }: ShowOptions = {}) => {
    const id = `snackbar-${++counter.current}`;
    setItems((prev) =>
      addSnackbar(prev, {
        id,
        message,
        variant,
        duration: resolveDuration(variant, duration),
      }),
    );
    return id;
  }, []);

  const dismiss = useCallback((id: string) => setItems((prev) => removeSnackbar(prev, id)), []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  const renderItems = (list: SnackbarItem[]) =>
    list.map((item) => (
      <SnackbarView key={item.id} item={item} closeLabel={closeLabel} onDismiss={dismiss} />
    ));

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <div className={`pointer-events-none fixed bottom-4 z-[60] flex flex-col gap-2 ${PLACEMENT[placement]}`}>
        {/* status/alert imply aria-atomic; turn it off so adding one snackbar
            doesn't make assistive tech re-read the ones already there. */}
        <div role="status" aria-atomic="false" aria-relevant="additions" className="flex flex-col gap-2">
          {renderItems(items.filter((i) => i.variant !== "error"))}
        </div>
        <div role="alert" aria-atomic="false" aria-relevant="additions" className="flex flex-col gap-2">
          {renderItems(items.filter((i) => i.variant === "error"))}
        </div>
      </div>
    </SnackbarContext.Provider>
  );
}

function SnackbarView({
  item,
  closeLabel,
  onDismiss,
}: {
  item: SnackbarItem;
  closeLabel: string;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const { box, Icon } = STYLES[item.variant];

  // Pause the countdown while the pointer or keyboard focus is on the snackbar.
  useEffect(() => {
    if (item.duration === null || paused) return;
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, paused, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-pill animate-snackbar-in motion-reduce:animate-none ${box}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 break-words">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label={closeLabel}
        className="-mr-1 shrink-0 rounded-full p-1 opacity-80 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
