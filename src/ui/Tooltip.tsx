type TooltipProps = {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function Tooltip({ label, children, defaultOpen = false }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-pill transition-opacity duration-150 group-hover:opacity-100 ${defaultOpen ? "opacity-100" : "opacity-0"}`}
      >
        {label}
        {/* Arrow */}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
      </span>
    </div>
  );
}
