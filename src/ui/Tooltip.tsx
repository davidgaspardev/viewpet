type TooltipProps = {
  label: string;
  children: React.ReactNode;
};

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <div className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-pill transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
        {/* Arrow */}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
      </span>
    </div>
  );
}
