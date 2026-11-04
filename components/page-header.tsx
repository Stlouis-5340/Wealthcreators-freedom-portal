export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="wc-eyebrow">{eyebrow}</p>
      <div className="wc-rule" />
      <h1 className="mt-4 text-4xl text-ink sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-base leading-7 text-muted">{lede}</p>
    </header>
  );
}
