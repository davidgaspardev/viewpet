type ActionButtonProps = {
  href: string;
  ariaLabel: string;
  variant: "filled" | "outline";
  external?: boolean;
  children: React.ReactNode;
};

export function ActionButton({
  href,
  ariaLabel,
  variant,
  external = false,
  children,
}: ActionButtonProps) {
  const base =
    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition active:scale-95";
  const variantClasses =
    variant === "filled"
      ? "bg-ink text-white hover:bg-ink/90"
      : "border border-black/10 bg-white text-ink hover:bg-black/[0.02]";
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={`${base} ${variantClasses}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
