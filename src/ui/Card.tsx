type CardProps = {
  title: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

export function Card({ title, headerAction, children }: CardProps) {
  return (
    <section className="rounded-xl bg-surface">
      <header className="mx-2 flex h-16 items-center justify-between border-b border-black/10 py-4">
        <h2 className="pl-2 text-lg font-bold tracking-tight text-ink">{title}</h2>
        {headerAction}
      </header>
      <div className="px-4 py-5 space-y-4">{children}</div>
    </section>
  );
}
