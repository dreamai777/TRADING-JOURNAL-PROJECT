import { ArrowRight, BookOpen, Brain, Crown, GraduationCap, LineChart, Plug, ScrollText, ShieldCheck, Sparkles, Swords, Zap } from "lucide-react";
import Link from "next/link";
import { GearIcon } from "@/components/gear-icon";
import { ItemIcon } from "@/components/item-icon";
import { GlowTracker } from "@/components/landing/glow";
import { CoachTeaser, LiveCalendar, LiveChart, LivePortfolio } from "@/components/landing/live-widgets";
import { ChampionParty, HoverChampion } from "@/components/landing/champions";
import { EpicWorld } from "@/components/landing/epic-world";
import { ProductTour } from "@/components/landing/product-tour";
import { PricingCards } from "@/components/pricing";
import { Logo } from "@/components/logo";
import { JOBS } from "@/core/character";
import { GEAR_TIERS } from "@/core/gear";
import { ITEMS, ITEM_BY_ID } from "@/core/items";
import type { JobClass } from "@/core/types";

/** A spread of catalog items shown on the landing page, one per tier and slot mix. */
const SHOWCASE: [string, number][] = [
  ["stoploss-signet", 0], ["trailworn-boots", 1], ["vanguard-buckler", 2], ["snapback-kris", 3], ["starweave-hat", 3], ["windrider-bow", 4],
  ["volume-sigil", 4], ["crested-greathelm", 5], ["stormbreak-staff", 5], ["heartstone-of-calm", 5], ["oathbrand-of-the-first-charge", 6], ["zero-spread-the-last-bolt", 6],
];

const BOSSES = [
  { name: "FOMO Hydra", icon: "🐍", color: "#4ade80", hp: 72, leak: "Chasing entries after the move already happened.", fight: "Flags late entries and shows what waiting for your trigger would have paid." },
  { name: "Revenge Golem", icon: "🗿", color: "#fb7a45", hp: 88, leak: "Jumping back in right after a loss to win it back.", fight: "Detects trades taken minutes after a loss and puts a cooldown timer on your screen." },
  { name: "Overleverage Titan", icon: "⚡", color: "#fbbf24", hp: 64, leak: "Sizing up after a win streak until one loss wipes the week.", fight: "Position-size calculator and alerts when your risk creeps above your plan." },
  { name: "Tilt Wraith", icon: "👻", color: "#a78bfa", hp: 55, leak: "Trading on emotion: anger, boredom, euphoria.", fight: "Tilt meter from your mood tags, and the exact dollar cost of each emotion." },
  { name: "Drawdown Dragon", icon: "🐉", color: "#ff5470", hp: 100, leak: "The final boss: a losing streak that breaks your account and your confidence.", fight: "HP bar tied to account health, max-drawdown guard, and a recovery quest line." },
];

const LOOP = [
  { icon: Zap, color: "#c8f53b", title: "Log in seconds", body: "Type a trade in one line, import a CSV, or let your exchange sync it for you. Spot, perpetuals, futures and bots." },
  { icon: LineChart, color: "#38d9f5", title: "See the truth", body: "Win rate, profit factor and expectancy by setup, hour, symbol and emotion, plus what each repeated mistake cost you in dollars." },
  { icon: Swords, color: "#fb7a45", title: "Fix one leak at a time", body: "Your worst habit becomes a boss. Quests and your Spellbook checklist give you one clear rule to follow next." },
  { icon: Crown, color: "#fbbf24", title: "Prove it worked", body: "Gear and ranks only move when your numbers improve over a real sample of trades. No luck, no vanity metrics." },
];

const PROOF = [
  { label: "Rules followed", from: "58%", to: "86%" },
  { label: "Average loss", from: "−1.6R", to: "−0.9R" },
  { label: "Profit factor", from: "0.92", to: "1.64" },
  { label: "Revenge trades a week", from: "4.1", to: "0.6" },
];

const TRUST = [
  "Read-only API keys. EdgeForge can never trade or withdraw from your account.",
  "Every number comes from your real fills, including fees and funding.",
  "Export all your data as CSV at any time. It's yours.",
  "Works in any browser on desktop and phone. The mobile app is next.",
];

const REALMS = [
  { icon: Zap, title: "One-snap journal", body: "Type “btc long 94100 → 95550 0.2 sl 93600” and it's logged with P&L, R and fees. Press N from anywhere.", color: "#c8f53b" },
  { icon: Plug, title: "Exchange sync", body: "Binance, OKX and Bitget with read-only keys. Prop firms next. Your history imports itself.", color: "#38d9f5" },
  { icon: LineChart, title: "Pro analytics", body: "Win rate, profit factor, expectancy, R-distribution, drawdown, time-of-day edge and a P&L calendar from 24h to 2 years.", color: "#2fe39a" },
  { icon: Swords, title: "Arsenal", body: "Every setup is a weapon with XP, level and rarity, earned only when the numbers prove the edge.", color: "#fb7a45" },
  { icon: ScrollText, title: "Spellbook", body: "Your playbook: entry rules, invalidation, targets and a pre-trade checklist you cast before every trade.", color: "#a78bfa" },
  { icon: Brain, title: "Mindset engine", body: "Tilt meter, emotion vs P&L, and the cost of every repeated mistake in dollars.", color: "#e879f9" },
  { icon: Sparkles, title: "Replay & share", body: "Replay any trade bar by bar, then share a clean card to X, Instagram or TikTok.", color: "#fbbf24" },
  { icon: BookOpen, title: "Backtest lab", body: "Test a setup across crypto, US equities, futures and forex before you risk a dollar.", color: "#60a5fa" },
];

function Section({ id, eyebrow, title, sub, children }: { id?: string; eyebrow: string; title: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center [text-shadow:0_2px_24px_rgba(0,0,0,.85)]">
        <div className="text-[11px] font-bold uppercase tracking-[.25em] text-accent">{eyebrow}</div>
        <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">{title}</h2>
        {sub && <p className="mx-auto mt-4 max-w-2xl text-base text-ink/80 sm:text-lg">{sub}</p>}
      </div>
      <div className="mt-12">{children}</div>
    </section>
  );
}

function Vista({ line, sub }: { line: string; sub: string }) {
  return (
    <div className="relative flex h-[62vh] min-h-[360px] flex-col items-center justify-center px-6 text-center [text-shadow:0_2px_30px_rgba(0,0,0,.9)]">
      <p className="max-w-3xl font-display text-3xl font-bold text-white/90 sm:text-5xl">{line}</p>
      <p className="mt-3 text-base text-white/70 sm:text-lg">{sub}</p>
    </div>
  );
}

function Panel({ title, tag, children, className = "" }: { title: string; tag: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`chrome rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-sm font-bold">{title}</div>
        <span className="flex items-center gap-1.5 rounded-full bg-profit/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-profit"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-profit" />{tag}</span>
      </div>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <GlowTracker />
      <EpicWorld />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[22%] h-[46%] w-[min(1000px,100%)] -translate-x-1/2 rounded-[50%] bg-[#07051a]/55 blur-3xl" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <a href="#why" className="hidden px-3 py-2 text-ink/70 hover:text-ink md:block">Why it works</a>
            <a href="#pricing" className="hidden px-3 py-2 text-ink/70 hover:text-ink md:block">Pricing</a>
            <a href="#classes" className="hidden px-3 py-2 text-ink/70 hover:text-ink md:block">Classes</a>
            <a href="#academy" className="hidden px-3 py-2 text-ink/70 hover:text-ink lg:block">Academy</a>
            <Link href="/roadmap" className="hidden px-3 py-2 text-ink/70 hover:text-ink sm:block">Roadmap</Link>
            <Link href="/login" className="px-3 py-2 text-ink/80 hover:text-ink">Log in</Link>
            <Link href="/login" className="chrome rounded-lg bg-accent px-4 py-2 font-bold text-accent-ink">Start free</Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 pt-8 text-center sm:px-6 sm:pt-14">
          <div className="chrome mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-1.5 text-xs text-ink/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_#c8f53b]" /> Season 1 · The Forge is open
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-[2.6rem] font-bold leading-[1.02] sm:text-7xl">
            <span className="chrome-text">Trading is another world.</span>
            <br />
            <span className="lime-text">Level up to survive it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink/75 sm:text-lg">
            The trading journal that turns every trade into progress. Log it in one snap or auto-sync your exchange, see exactly where you win and lose, and level up a hero that only grows when your trading does.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="chrome group flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-bold text-accent-ink shadow-[0_14px_50px_-12px_rgba(200,245,59,.9)]">
              Start your adventure <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="chrome rounded-xl border border-white/15 bg-black/30 px-6 py-3.5 font-semibold backdrop-blur">Try the live demo</Link>
          </div>
        </div>

        {/* party on the ridge, with floating HUD callouts */}
        <div className="relative z-10 mx-auto mt-6 w-full max-w-5xl px-4 pb-10 sm:mt-0">
          <div className="pointer-events-none absolute left-2 top-0 hidden -translate-y-full md:block lg:left-0">
            <div className="float-y rounded-xl border border-gold/30 bg-black/50 px-3 py-2 text-left text-xs backdrop-blur">
              <div className="font-bold text-gold">+340 XP · Clean exit</div>
              <div className="text-ink/60">Took profit at plan, rules 5/5</div>
            </div>
          </div>
          <div className="pointer-events-none absolute right-2 top-0 hidden -translate-y-full md:block lg:right-0" style={{ animationDelay: "-2.5s" }}>
            <div className="float-y rounded-xl border border-loss/30 bg-black/50 px-3 py-2 text-left text-xs backdrop-blur" style={{ animationDelay: "-2.5s" }}>
              <div className="font-bold text-loss">⚔ Boss defeated: Revenge Golem</div>
              <div className="text-ink/60">7 days with no revenge trades</div>
            </div>
          </div>
          <div className="relative">
            <ChampionParty jobs={["archer", "wizard", "warrior", "defender", "assassin", "sniper"]} sizes={[205, 225, 255, 215, 215, 205]} />
            {/* rock ledge the party stands on */}
            <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-7 left-1/2 h-14 w-[115%] -translate-x-1/2" aria-hidden>
              <defs><linearGradient id="ledge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2f2a" /><stop offset=".25" stopColor="#141016" /><stop offset="1" stopColor="#06080c" stopOpacity="0" /></linearGradient></defs>
              <path d="M0 30 Q60 12 140 18 L260 10 Q330 6 420 12 L560 8 Q660 4 760 12 L880 10 Q950 16 1000 30 L1000 60 L0 60Z" fill="url(#ledge)" />
              <path d="M140 18 L260 10 Q330 6 420 12 L560 8 Q660 4 760 12 L880 10" stroke="#ffcf9a" strokeOpacity=".35" strokeWidth="1.2" fill="none" />
            </svg>
          </div>

        </div>
        <a href="#live" aria-label="Scroll to features" className="relative z-10 mx-auto mb-6 flex h-9 w-6 justify-center rounded-full border border-white/25 pt-1.5"><span className="scroll-cue h-2 w-1 rounded-full bg-white/70" /></a>
      </section>

      {/* ── WHY IT WORKS ────────────────────────────────────── */}
      <Section id="why" eyebrow="Why traders use it" title={<>A journal that actually <span className="lime-text">makes you better</span>.</>} sub="Most accounts are drained by the same few habits, repeated. EdgeForge finds yours, puts a dollar number on each one, and gives you one quest at a time to fix it. Then it proves the fix worked.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((s, i) => (
            <div key={s.title} tabIndex={0} className="chrome rounded-2xl border border-line bg-surface/85 p-5 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg font-display font-bold" style={{ background: `${s.color}22`, color: s.color }}>{i + 1}</span>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="mt-3 font-display text-lg font-bold">{s.title}</div>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12"><ProductTour /></div>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="chrome rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur">
            <div className="text-[11px] font-bold uppercase tracking-[.2em] text-accent">What 8 weeks of honest journaling looks like</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {PROOF.map((m) => (
                <div key={m.label} className="rounded-xl bg-surface-2 p-3">
                  <div className="text-[11px] text-muted">{m.label}</div>
                  <div className="num mt-1 flex items-baseline gap-2"><span className="text-sm text-faint line-through decoration-loss/60">{m.from}</span><span className="text-xl font-bold text-profit">{m.to}</span></div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-faint">Illustrative example built from the demo account. Results vary, and nothing here is a promise of profit.</p>
          </div>
          <div className="chrome rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur">
            <div className="text-[11px] font-bold uppercase tracking-[.2em] text-cyan">Built to be trusted</div>
            <ul className="mt-4 space-y-3 text-sm">
              {TRUST.map((t) => <li key={t} className="flex gap-2.5"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-cyan" />{t}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      {/* ── LIVE COMMAND CENTER ─────────────────────────────── */}
      <Section id="live" eyebrow="Your command center" title={<>Every number that matters, <span className="lime-text">live</span>.</>} sub="Charts, portfolio, calendar and coach update in real time as your trades sync. Shown here with demo data.">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="Live position" tag="Live"><LiveChart /></Panel>
          <Panel title="Portfolio tracker" tag="Synced"><LivePortfolio /></Panel>
          <Panel title="AI coach" tag="Preview" className="lg:order-last"><CoachTeaser /></Panel>
          <Panel title="Trading journal calendar" tag="Auto" className="lg:col-span-2"><LiveCalendar /></Panel>
        </div>
        <p className="mt-4 text-center text-xs text-faint">The AI coach preview shows the kind of answers it gives. Full coach arrives in Phase 2.</p>
      </Section>

      <Vista line="Beyond the ridge, the Titan of Drawdown wakes." sub="Every account meets it. Prepared traders survive it." />

      {/* ── CLASSES ─────────────────────────────────────────── */}
      <Section id="classes" eyebrow="Choose your class" title="What kind of trader are you?" sub="Each class plays to a different style. Your character's mood follows your real trades: on fire after clean wins, wounded after a bad day, burned out when you overtrade.">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {(Object.keys(JOBS) as JobClass[]).map((id) => {
            const j = JOBS[id];
            return (
              <div key={id} tabIndex={0} className="chrome group rounded-2xl border border-line bg-surface p-4 sm:p-5" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${j.color}1f, transparent 60%), var(--surface)` }}>
                <div className="flex h-[150px] items-end justify-center sm:h-[170px]">
                  <HoverChampion job={id} size={150} />
                </div>
                <div className="mt-3 font-display text-lg font-bold" style={{ color: j.color }}>{j.name}</div>
                <div className="text-xs font-semibold text-ink/80">{j.style}</div>
                <p className="mt-1.5 hidden text-xs text-muted sm:block">{j.blurb}</p>
                <div className="mt-2 text-[10px] text-faint">{j.titles.join(" → ")}</div>
              </div>
            );
          })}
        </div>
        <div className="chrome mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-violet/30 bg-violet/5 p-5 text-center sm:flex-row sm:text-left">
          <div className="text-3xl">🧭</div>
          <div className="flex-1">
            <div className="font-display font-bold">Not sure? Take the Trader Class Test</div>
            <div className="text-sm text-muted">Find out if you&apos;re a scalper, day trader, momentum, swing, position trader or investor, with a chart of your strengths and weaknesses and a study path built for you.</div>
          </div>
          <Link href="/class-test" className="shrink-0 rounded-lg bg-violet px-4 py-2 text-sm font-bold text-bg">Take the test</Link>
        </div>
      </Section>

      {/* ── BOSSES ──────────────────────────────────────────── */}
      <Section eyebrow="Bosses you'll fight" title={<>Every trader fights the same monsters.<br className="hidden sm:block" /> Now you can <span className="text-loss">see them</span>.</>} sub="EdgeForge spots the habits that drain accounts and turns each one into a boss with an HP bar. Beat it by changing the habit, not by getting lucky.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BOSSES.map((b, k) => (
            <div key={b.name} tabIndex={0} className={`chrome flex flex-col rounded-2xl border border-line bg-surface p-4 ${k === 4 ? "sm:col-span-2 lg:col-span-1" : ""}`} style={{ background: `radial-gradient(100% 60% at 50% 0%, ${b.color}22, transparent 70%), var(--surface)` }}>
              <div className="flex items-center justify-between">
                <span className="text-4xl drop-shadow-[0_0_14px_rgba(255,255,255,.25)]">{b.icon}</span>
                {k === 4 && <span className="rounded bg-loss/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-loss">Final boss</span>}
              </div>
              <div className="mt-3 font-display font-bold" style={{ color: b.color }}>{b.name}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${b.hp}%`, background: `linear-gradient(90deg, ${b.color}, #ff5470)` }} /></div>
              <p className="mt-3 text-xs text-ink/80">{b.leak}</p>
              <p className="mt-2 text-xs text-muted"><b className="text-accent">How you win:</b> {b.fight}</p>
            </div>
          ))}
        </div>
      </Section>

      <Vista line="The storm brings the Demon of Tilt." sub="Revenge trades feed it. Rules starve it." />

      {/* ── GEAR ────────────────────────────────────────────── */}
      <Section eyebrow="Loot you can't buy" title={<>Gear that only <span className="lime-text">real edge</span> unlocks.</>} sub="Every setup forges a weapon. It upgrades through seven tiers as your win rate, profit factor and discipline prove themselves over a real number of trades. A lucky week can't fake it, and gear can lose its tier if you slip.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {GEAR_TIERS.map((t, i) => (
            <div key={t.id} tabIndex={0} className={`chrome flex flex-col items-center rounded-2xl border bg-surface p-3 text-center ${i === 6 ? "col-span-2 sm:col-span-4 lg:col-span-1" : ""}`} style={{ borderColor: `${t.color}40`, background: `radial-gradient(90% 60% at 50% 25%, ${t.color}22, transparent 70%), var(--surface)` }}>
              <GearIcon tier={t} index={i} size={84} />
              <div className={`mt-1 font-display text-sm font-black uppercase tracking-wider ${i === 6 ? "god-tier" : ""}`} style={{ color: t.color }}>{t.name}</div>
              <div className="num mt-1 text-[10px] leading-relaxed text-muted">
                {i === 0 ? "Start" : <>{t.minTrades}+ trades{t.minWinRate > 0 && <><br />{Math.round(t.minWinRate * 100)}% WR · PF {t.minProfitFactor}</>}</>}
              </div>
            </div>
          ))}
        </div>
        <div className="chrome mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">The Armory</div>
              <div className="font-display text-xl font-bold sm:text-2xl">{ITEMS.length} named items. Every one levels up.</div>
              <p className="mt-1 max-w-2xl text-sm text-muted">Weapons, helms, armor, cloaks, boots, off-hands and trinkets for all six classes. Each is bound to a setup type and climbs from Basic to God on that setup&apos;s win rate. The higher the tier and level, the brighter it glows on your hero.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {SHOWCASE.map(([id, t]) => {
              const it = ITEM_BY_ID[id];
              return (
                <div key={id} className="flex flex-col items-center rounded-xl bg-surface-2 p-2 text-center" title={it.name}>
                  <ItemIcon art={it.art} tierIndex={t} glow={t + 0.6} size={56} />
                  <div className="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight" style={{ color: GEAR_TIERS[t].color }}>{it.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── ACADEMY ─────────────────────────────────────────── */}
      <Section id="academy" eyebrow="The Academy" title="Learn faster. Get battle-ready sooner." sub="Courses that plug into your journal. Lessons unlock as you complete quests, and your class test tells you exactly what to study next.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="chrome flex flex-col rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-ink/80"><GraduationCap size={18} className="text-cyan" /> Adventurer · Free</div>
            <div className="mt-2 font-display text-3xl font-bold">$0 <span className="text-base font-medium text-muted">forever</span></div>
            <ul className="mt-5 space-y-2.5 text-sm">
              {["Full journal, analytics, calendar and character", "Self-study library: risk, setups, psychology", "New lessons unlock every time you finish a quest", "Trader Class Test with your personal study path", "Exchange sync for 1 account"].map((x) => <li key={x} className="flex gap-2"><span className="text-profit">✓</span>{x}</li>)}
            </ul>
            <Link href="/login" className="chrome mt-6 rounded-xl border border-line-strong py-3 text-center font-semibold">Start free</Link>
          </div>
          <div className="chrome relative flex flex-col overflow-hidden rounded-2xl border border-gold/40 p-6" style={{ background: "radial-gradient(120% 80% at 100% 0%, rgba(251,191,36,.16), transparent 60%), radial-gradient(100% 60% at 0% 100%, rgba(167,139,250,.14), transparent 60%), var(--surface)" }}>
            <div className="flex items-center gap-2 text-sm font-bold text-gold"><Crown size={18} /> Premium Academy</div>
            <div className="mt-2 font-display text-3xl font-bold">Speed-run <span className="text-base font-medium text-muted">your learning curve</span></div>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "Premium channel with live trade breakdowns",
                "Video vault: recorded sessions, A+ setup library, real examples",
                "Battle-ready paths: 30-day plans per class",
                "Full AI coach: weekly reports and leak alerts",
                "Live trading sessions and 1:1 reviews on Ultra",
                "Early access to every new feature",
              ].map((x) => <li key={x} className="flex gap-2"><span className="text-gold">◆</span>{x}</li>)}
            </ul>
            <a href="#pricing" className="chrome mt-6 rounded-xl bg-gradient-to-r from-gold to-[#fb923c] py-3 text-center font-bold text-bg">See Premium and Ultra</a>
          </div>
        </div>
      </Section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <Section id="pricing" eyebrow="Plans" title={<>Start free. <span className="lime-text">Upgrade when it pays for itself.</span></>} sub="Journaling and your real numbers are free forever. Premium saves you time and finds your edge faster. Ultra is for full-time and prop-firm traders.">
        <PricingCards />
        <div className="mt-6 text-center"><Link href="/pricing" className="text-sm font-semibold text-accent hover:underline">Compare every feature →</Link></div>
      </Section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <Section id="features" eyebrow="The full arsenal" title="Everything a serious trader needs." sub="Built for crypto first, ready for stocks, futures, forex and prop firms.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REALMS.map((f) => (
            <div key={f.title} tabIndex={0} className="chrome rounded-2xl border border-line bg-surface p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${f.color}18`, color: f.color }}><f.icon size={20} /></div>
              <div className="mt-3 font-display font-bold">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="chrome relative overflow-hidden rounded-3xl border border-line p-8 text-center sm:p-14" style={{ background: "radial-gradient(80% 120% at 50% 0%, rgba(200,245,59,.14), transparent 60%), radial-gradient(60% 80% at 100% 100%, rgba(56,217,245,.12), transparent 60%), var(--surface)" }}>
          <div className="mx-auto flex justify-center"><HoverChampion job="warrior" size={170} /></div>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-5xl"><span className="chrome-text">Your adventure starts with one trade.</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">Log it, learn from it, level up. Free to start, no card needed.</p>
          <Link href="/login" className="chrome mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-4 font-bold text-accent-ink shadow-[0_14px_50px_-12px_rgba(200,245,59,.9)]">Enter the Forge <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-xs text-faint">
        EdgeForge · Not financial advice · <Link href="/roadmap" className="hover:text-ink">Roadmap</Link>
      </footer>
    </div>
  );
}
