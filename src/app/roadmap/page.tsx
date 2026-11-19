import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "About & Roadmap · EdgeForge" };

const PHASES = [
  {
    tag: "Now", title: "Phase 1 · Forge", status: "live", color: "#2fe39a",
    items: ["One-snap journaling with one-line parser", "Dashboard: win rate, profit factor, expectancy, drawdown, Forge Score", "Arsenal: setups as weapons with XP, levels and earned rarity", "Playbooks with pre-trade checklists", "Mindset & Risk: tilt meter, emotion and mistake costs, position sizing", "Trade replay and social share cards", "CSV import, 14-currency display toggle", "Multi-asset backtest lab", "User and admin roles", "AI Council: trade analyst, habit, risk and sentiment agents, personal coach and custom agents (Claude)", "Notebook, trade review pages with run-up and heat, Reports with heatmaps and Compare"],
  },
  {
    tag: "Next", title: "Phase 2 · Connect", status: "building", color: "#c8f53b",
    items: ["Live Binance, OKX and Bitget sync (read-only keys, server-side workers)", "Supabase auth with Google, Apple and Discord login", "Real candles for replay (exchange klines)", "Live market sentiment feed (fear and greed, funding, long/short) for the Sentiment agent", "AI pre-trade check against your Spellbook", "Screenshot and chart uploads per trade", "PWA install + push reminders to journal"],
  },
  {
    tag: "Later", title: "Phase 3 · Compete", status: "planned", color: "#a78bfa",
    items: ["Prop firm connectors (Breakout and more) with evaluation rule tracking", "Mobile app (iOS and Android) sharing the same core engine", "Community feed, guilds and opt-in leaderboards ranked by discipline", "Mentor mode: share your journal read-only with a coach", "Backtests on real US equities, options, CME futures, crypto and FX data"],
  },
  {
    tag: "Future", title: "Phase 4 · Academy", status: "planned", color: "#fbbf24",
    items: ["Courses unlocked by rank", "Trading challenges and seasons", "Strategy marketplace for verified playbooks", "Tax and broker statement reports"],
  },
];

export default function RoadmapPage() {
  return (
    <div className="grid-bg min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Open app</Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="py-12">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-accent">About</div>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Built to make traders better, not busier.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">EdgeForge turns your journal into a training ground. XP rewards process, not P&L. Setups earn rarity only when the numbers prove them. Every feature exists to help you find your edge and protect it.</p>
        </section>
        <section>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-accent">Roadmap</div>
          <div className="relative mt-8 space-y-6 border-l border-line pl-8">
            {PHASES.map((p) => (
              <div key={p.title} className="relative">
                <span className="absolute -left-[41px] top-5 h-4 w-4 rounded-full border-4 border-bg" style={{ background: p.color, boxShadow: `0 0 16px ${p.color}` }} />
                <div className="card p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase" style={{ background: `${p.color}22`, color: p.color }}>{p.tag}</span>
                    <h2 className="font-display text-xl font-bold">{p.title}</h2>
                    <span className="ml-auto text-xs capitalize text-muted">{p.status}</span>
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {p.items.map((i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted"><span style={{ color: p.color }}>{p.status === "live" ? "✓" : "○"}</span>{i}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
