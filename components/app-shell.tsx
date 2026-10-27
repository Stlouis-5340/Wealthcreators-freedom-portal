"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { usePortal } from "@/components/portal-provider";
import { signOutAction } from "@/lib/auth-actions";
import type { Role } from "@/lib/types";

const memberNav = [
  { href: "/", label: "Dashboard" },
  { href: "/goals", label: "Goals" },
  { href: "/assets", label: "Net Worth" },
  { href: "/spending", label: "Spending Plan" },
  { href: "/milestones", label: "Milestones" },
];

const guideNav = [{ href: "/guide", label: "Roster" }];

function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string; email: string; role: Role };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resetDemo } = usePortal();
  const [menuOpen, setMenuOpen] = useState(false);
  const homeHref = user.role === "guide" ? "/guide" : "/";
  const links = user.role === "guide" ? guideNav : memberNav;

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleReset() {
    const confirmed = window.confirm(
      user.role === "guide"
        ? "Reset seeded plans and steps for your assigned members? Plaid connections stay in place."
        : "Reset your spending plan, sample balances, and steps to the seeded sample? Plaid connections stay in place.",
    );
    if (!confirmed) return;
    resetDemo();
    closeMenu();
    router.push(homeHref);
  }

  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pt-6">
          <Link href={homeHref} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
            <BrandLogo className="h-auto w-full" priority />
          </Link>
          <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-gold-muted">
            Freedom Portal
          </p>
        </div>
        <nav className="mt-6 flex-1 space-y-1 px-3" aria-label="Primary">
          {links.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={navActive(pathname, item.href)}
              onNavigate={closeMenu}
            />
          ))}
        </nav>
        <AccountCard user={user} onReset={handleReset} />
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href={homeHref} className="min-w-0">
            <BrandLogo className="h-[72px] w-auto" priority />
          </Link>
          <button
            type="button"
            className="wc-btn wc-btn-ghost shrink-0"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </header>
        <main id="content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
          <p className="mt-12 max-w-3xl text-xs leading-5 text-muted">
            Seeded sample plan for the Wealth Creators demo, as of October 27, 2026.
            Edits are saved to the portal database. Plaid access tokens stay on the server,
            and guides see totals only. Freedom Score and yield are planning tools, not
            investment advice.
          </p>
        </main>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-nav"
            className="absolute inset-y-0 right-0 flex w-[min(100%,320px)] flex-col border-l border-line bg-surface"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <p className="wc-eyebrow">Freedom Portal</p>
              <button type="button" className="wc-btn wc-btn-ghost" onClick={() => setMenuOpen(false)}>
                Close
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3" aria-label="Mobile">
            {links.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={navActive(pathname, item.href)}
                onNavigate={closeMenu}
              />
            ))}
          </nav>
          <AccountCard user={user} onReset={handleReset} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavLink({
  href,
  active,
  label,
  onNavigate,
}: {
  href: string;
  active: boolean;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`block rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        active
          ? "border-gold bg-surface-raised text-ink"
          : "border-transparent text-muted hover:bg-surface-raised hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

function AccountCard({
  user,
  onReset,
}: {
  user: { name: string; email: string; role: Role };
  onReset: () => void;
}) {
  const title = user.role === "guide" ? "Wealth Guide" : "Member";
  return (
    <div className="border-t border-line p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Signed in</p>
      <p className="mt-2 text-sm font-medium text-ink">{user.name}</p>
      <p className="text-xs text-gold-muted">{title}</p>
      <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
      <form action={signOutAction}>
        <button type="submit" className="wc-btn wc-btn-primary mt-3 w-full">
          Sign out
        </button>
      </form>
      <button
        type="button"
        className="mt-2 w-full text-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        onClick={onReset}
      >
        Reset demo data
      </button>
    </div>
  );
}
