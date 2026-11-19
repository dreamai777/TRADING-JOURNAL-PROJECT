import Link from "next/link";
import { Logo } from "@/components/logo";
import { FeatureTable, PricingCards } from "@/components/pricing";

export const metadata = { title: "Pricing · EdgeForge" };

const FAQ = [
  ["Is the free plan really free forever?", "Yes. Unlimited manual journaling, CSV import, one synced exchange account, core stats, the P&L calendar and the whole game layer stay free. No card needed."],
  ["Which exchanges and markets are supported?", "Binance, OKX, Bitget and Bybit first, with more coming. Spot and perpetual futures are on every plan. Dated futures, margin, grid bots, DCA bots and copy trading are on Premium and Ultra."],
  ["Can EdgeForge trade or withdraw with my API keys?", "No. We only accept read-only keys and reject keys with trading or withdrawal permissions."],
  ["Can I switch plans or cancel?", "Any time. If you downgrade, your journal and history stay. Features above your plan simply lock again."],
  ["What does Ultra add for prop-firm traders?", "Unlimited prop accounts with live rule tracking (daily loss, max drawdown, consistency), unlimited AI coach with a pre-trade checklist check, live sessions and a monthly 1:1 journal review."],
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Start free</Link>
      </header>
      <div className="mx-auto mt-8 max-w-2xl text-center">
        <div className="text-[11px] font-bold uppercase tracking-[.25em] text-accent">Plans</div>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Pick your path</h1>
        <p className="mt-3 text-muted">Journal free forever. Upgrade for real-time sync, deep analytics, the AI coach and the premium Academy.</p>
      </div>
      <div className="mt-10"><PricingCards /></div>
      <h2 className="mb-4 mt-16 font-display text-2xl font-bold">Compare every feature</h2>
      <FeatureTable />
      <h2 className="mb-4 mt-16 font-display text-2xl font-bold">Questions</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {FAQ.map(([q, a]) => (
          <div key={q} className="rounded-2xl border border-line bg-surface p-5">
            <div className="font-semibold">{q}</div>
            <p className="mt-1.5 text-sm text-muted">{a}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-faint">Prices in USD. Taxes may apply. Plans are shown for the prototype; checkout is not live yet.</p>
    </div>
  );
}
