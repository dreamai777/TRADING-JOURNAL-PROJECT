import Link from "next/link";
import { Logo } from "@/components/logo";

const FEATURES = [
  { icon: "⚡", title: "One-snap journaling", body: "Type “btc long 90100 → 91550 0.2 sl 89600” and it's logged. Press N from anywhere." },
  { icon: "🗡️", title: "Arsenal of weapons", body: "Your setups level up and earn rarity (Common → Legendary) only when the stats prove the edge." },
  { icon: "📊", title: "Pro analytics", body: "Win rate, profit factor, expectancy, R-distribution, drawdown, P&L calendar, time-of-day edges." },
  { icon: "🧠", title: "Mindset engine", body: "Tilt meter, emotion vs P&L, and the exact dollar cost of each mistake you repeat." },
  { icon: "🔌", title: "Exchange sync", body: "Binance, OKX and Bitget with read-only keys. Prop firms and brokers coming next." },
  { icon: "🎬", title: "Replay & share", body: "Replay any trade bar by bar, then share a clean card to X, Instagram, TikTok and more." },
  { icon: "🧪", title: "Multi-asset backtests", body: "Test across US equities, options, CME futures, crypto and forex to prove robustness." },
  { icon: "🌍", title: "Your currency", body: "Flip your whole journal between 14 major currencies with one toggle." },
  { icon: "🤖", title: "AI coach", body: "Finds your leaks and your golden hours, then tells you exactly what to do next." },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden">
      <div className="grid-bg absolute inset-x-0 top-0 h-[720px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/roadmap" className="hidden px-3 py-2 text-muted hover:text-ink sm:block">About & Roadmap</Link>
          <Link href="/login" className="px-3 py-2 text-muted hover:text-ink">Log in</Link>
          <Link href="/login" className="rounded-lg bg-accent px-4 py-2 font-bold text-accent-ink">Start free</Link>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-6">
        <section className="pb-20 pt-16 text-center sm:pt-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-profit shadow-[0_0_8px_#2fe39a]" /> Prototype · Phase 1 live
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.02] sm:text-7xl">
            The trading journal that <span className="text-accent">levels you up.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">Journal in one snap. Turn setups into weapons. Find the leaks costing you money. Every trade is XP, and discipline is how you rank up.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-accent px-6 py-3.5 font-bold text-accent-ink shadow-[0_12px_40px_-12px_rgba(200,245,59,.8)]">Try the live demo</Link>
            <Link href="/roadmap" className="rounded-xl border border-line-strong px-6 py-3.5 font-semibold">See the roadmap</Link>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-left">
            {[["57%", "Win rate tracked live"], ["2.04", "Profit factor, per setup"], ["Lv 21", "Ranks earned by discipline"]].map(([v, l]) => (
              <div key={l} className="bg-surface px-5 py-4"><div className="num text-2xl font-bold text-accent">{v}</div><div className="text-xs text-muted">{l}</div></div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-3xl">{f.icon}</div>
              <div className="mt-3 font-display text-lg font-semibold">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="relative border-t border-line py-8 text-center text-xs text-faint">
        EdgeForge prototype · Not financial advice · <Link href="/roadmap" className="hover:text-ink">Roadmap</Link>
      </footer>
    </div>
  );
}
