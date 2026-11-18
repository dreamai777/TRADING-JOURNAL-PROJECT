"use client";
import { BarChart3, Bot, BookOpen, Crown, FlaskConical, LayoutDashboard, LogOut, Map, Plug, Plus, Settings, Swords, Brain, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FX } from "@/core/currency";
import type { CurrencyCode } from "@/core/types";
import { useJournal } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { Logo } from "./logo";
import { QuickSnap } from "./quick-snap";
import { Progress, cn } from "./ui";
import { GlowTracker } from "./landing/glow";

const NAV = [
  { href: "/dashboard", label: "Command Center", short: "Home", icon: LayoutDashboard },
  { href: "/profile", label: "My Character", short: "Hero", icon: UserRound },
  { href: "/journal", label: "Journal", short: "Journal", icon: BookOpen },
  { href: "/arsenal", label: "Arsenal", short: "Arsenal", icon: Swords },
  { href: "/analytics", label: "Analytics", short: "Stats", icon: BarChart3 },
  { href: "/mindset", label: "Mindset & Risk", short: "Mind", icon: Brain },
  { href: "/backtest", label: "Backtest Lab", short: "Lab", icon: FlaskConical },
  { href: "/coach", label: "AI Coach", short: "Coach", icon: Bot },
  { href: "/connections", label: "Connections", short: "Sync", icon: Plug },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const sessionUserId = useStore((s) => s.sessionUserId);
  const router = useRouter();
  const pathname = usePathname();
  const [snapOpen, setSnapOpen] = useState(false);
  const { me, progress } = useJournal();

  useEffect(() => {
    if (hydrated && !sessionUserId) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, sessionUserId, router, pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setSnapOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!hydrated || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size={40} />
          <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-3">
            <div className="shimmer h-full w-full" />
          </div>
        </div>
        <div hidden>{children}</div>
      </div>
    );
  }

  const nav = me.role === "admin" ? [...NAV, { href: "/admin", label: "Admin", short: "Admin", icon: Crown }] : NAV;

  return (
    <div className="flex min-h-screen">
      <GlowTracker />
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface/60 lg:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <div className="px-3">
          <button onClick={() => setSnapOpen(true)} className="group flex w-full cursor-pointer items-center justify-between rounded-xl bg-accent px-3.5 py-2.5 text-sm font-bold text-accent-ink shadow-[0_8px_28px_-10px_rgba(200,245,59,.7)] transition hover:brightness-110">
            <span className="flex items-center gap-2">
              <Plus size={16} strokeWidth={3} /> Snap a trade
            </span>
            <kbd className="rounded bg-black/15 px-1.5 text-[10px] font-bold">N</kbd>
          </button>
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors", active ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink")}>
                <n.icon size={17} className={active ? "text-accent" : ""} />
                {n.label}
              </Link>
            );
          })}
          <div className="my-3 border-t border-line" />
          <Link href="/roadmap" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
            <Map size={17} /> Roadmap
          </Link>
          <Link href="/settings" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium", pathname.startsWith("/settings") ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink")}>
            <Settings size={17} /> Settings
          </Link>
        </nav>
        {/* Rank card */}
        <div className="m-3 rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3 text-lg">{me.avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{me.name}</div>
              <div className="text-[11px] font-semibold" style={{ color: progress.rank.color }}>
                Lv {progress.level} · {progress.rank.name}
              </div>
            </div>
            <button onClick={() => { useStore.getState().logout(); router.replace("/login"); }} className="cursor-pointer rounded-md p-1.5 text-faint hover:bg-surface-3 hover:text-ink" title="Log out" aria-label="Log out">
              <LogOut size={15} />
            </button>
          </div>
          <Progress value={progress.progress} color={progress.rank.color} className="mt-3" height={5} />
          <div className="num mt-1.5 flex justify-between text-[10.5px] text-faint">
            <span>{progress.xp.toLocaleString()} XP</span>
            <span>{progress.next ? `${progress.next.name} @ ${progress.next.min.toLocaleString()}` : "MAX"}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="lg:hidden">
            <Logo size={24} />
          </div>
          <div className="flex-1" />
          <CurrencyToggle />
          <XpChip />
          <button onClick={() => setSnapOpen(true)} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-accent-ink lg:hidden">
            <Plus size={15} strokeWidth={3} /> Snap
          </button>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile tab bar (mirrors the future Expo app) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden">
        {nav.slice(0, 5).map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold", active ? "text-accent" : "text-muted")}>
              <n.icon size={19} />
              {n.short}
            </Link>
          );
        })}
      </nav>

      <QuickSnap open={snapOpen} onClose={() => setSnapOpen(false)} />
    </div>
  );
}

function CurrencyToggle() {
  const currency = useStore((s) => s.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  return (
    <label className="relative flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface-2 pl-2.5 pr-1 text-xs font-semibold" title="Display currency">
      <span>{FX[currency].flag}</span>
      <span className="pr-4">{currency}</span>
      <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Display currency">
        {(Object.keys(FX) as CurrencyCode[]).map((c) => (
          <option key={c} value={c} className="bg-surface">
            {c} · {FX[c].name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[9px] text-faint">▼</span>
    </label>
  );
}

function XpChip() {
  const { progress } = useJournal();
  const gain = useStore((s) => s.lastXpGain);
  return (
    <div className="relative hidden h-9 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 sm:flex">
      <span className="whitespace-nowrap text-[11px] font-bold" style={{ color: progress.rank.color }}>
        LV {progress.level}
      </span>
      <Progress value={progress.progress} color={progress.rank.color} className="w-20" height={4} />
      <span className="num whitespace-nowrap text-[11px] text-muted">{progress.xp.toLocaleString()} XP</span>
      {gain && <span key={gain.at} className="xp-pop num pointer-events-none absolute -bottom-7 right-2 rounded-md bg-gold px-2 py-0.5 text-xs font-bold text-black">+{gain.amount} XP</span>}
    </div>
  );
}
