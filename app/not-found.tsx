import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wc-card mx-auto mt-16 max-w-xl p-6 sm:p-8">
      <p className="wc-eyebrow">Freedom Portal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        That page is not in the portal
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        The link may be old. The dashboard and the guide roster are the two places to start.
      </p>
      <Link href="/" className="wc-btn wc-btn-primary mt-6">
        Go to dashboard
      </Link>
    </section>
  );
}
