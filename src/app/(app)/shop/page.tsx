"use client";
import { ArrowRight, BadgeCheck, Check, Gift, Search, ShieldCheck, Star, Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { GoldChip, GradeBadge, PriceTag, RarityPill, tierOf } from "@/components/shop/gold";
import { Button, Card, CardHeader, Empty, Input, Label, Modal, PageHeader, Pill, Select, cn } from "@/components/ui";
import { syntheticSeries } from "@/core/market";
import { CRYPTO_ASSETS, PAY_METHODS, demoPayments, type CryptoAsset, type PayMethod, type Receipt } from "@/core/payments";
import { CREATOR_SHARE, KIND_META, type Listing, type ListingKind } from "@/core/shop";
import { auditStrategy, explainSpec } from "@/core/strategy";
import { useGold } from "@/lib/gold";
import { useJournal } from "@/lib/hooks";
import { useMarket } from "@/lib/market-store";

type Tab = "all" | ListingKind | "library" | "selling" | "wallet";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "strategy", label: "🧪 Lab Research" },
  { id: "setup", label: "🗡️ Weapons" },
  { id: "skill", label: "📜 Skills" },
  { id: "item", label: "💎 Items" },
  { id: "library", label: "My library" },
  { id: "selling", label: "My listings" },
  { id: "wallet", label: "🪙 Wallet" },
];
type Sort = "trending" | "rating" | "new" | "price-low" | "verified";
type PriceFilter = "any" | "gold" | "usd" | "free";

export default function ShopPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "all") as Tab;
  const setTab = (t: Tab) => router.replace(t === "all" ? "/shop" : `/shop?tab=${t}`, { scroll: false });
  const { me } = useJournal();
  const listings = useMarket((s) => s.listings);
  const purchases = useMarket((s) => s.purchases);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("trending");
  const [price, setPrice] = useState<PriceFilter>("any");
  const [open, setOpen] = useState<Listing | null>(null);

  const owned = useMemo(() => new Set(purchases.filter((p) => p.userId === me?.id).map((p) => p.listingId)), [purchases, me?.id]);
  const shown = useMemo(() => {
    let ls = listings;
    if (tab === "library") ls = ls.filter((l) => owned.has(l.id));
    else if (tab === "selling") ls = ls.filter((l) => l.sellerId === me?.id);
    else if (tab !== "all" && tab !== "wallet") ls = ls.filter((l) => l.kind === tab);
    if (q.trim()) {
      const s = q.toLowerCase();
      ls = ls.filter((l) => [l.title, l.tagline, l.sellerName, ...l.tags].some((x) => x.toLowerCase().includes(s)));
    }
    if (price === "gold") ls = ls.filter((l) => l.priceGold > 0);
    if (price === "usd") ls = ls.filter((l) => l.priceUsd > 0);
    if (price === "free") ls = ls.filter((l) => !l.priceGold && !l.priceUsd);
    const score = (l: Listing) => ({ trending: l.sales / Math.max(1, (Date.now() - +new Date(l.createdAt)) / 864e5 + 3), rating: l.rating * 1000 + l.reviews, new: +new Date(l.createdAt), "price-low": -(l.priceUsd * 100 || l.priceGold), verified: (l.verified?.livePf ?? 0) * 100 + (l.verified?.liveTrades ?? 0) / 10 })[sort];
    return [...ls].sort((a, b) => score(b) - score(a));
  }, [listings, tab, owned, me?.id, q, price, sort]);

  const featured = listings.filter((l) => l.verified?.grade === "S+" || l.verified?.grade === "S++").slice(0, 1)[0];

  return (
    <div>
      <PageHeader title="Hero Shop" subtitle="Strategies, weapons, skills and items from proven traders. Pay with Gold you earn, card or crypto." right={<><GoldChip className="sm:hidden" /><Link href="/strategy-lab"><Button size="sm" variant="outline"><Store size={14} /> Sell yours</Button></Link></>} />

      {tab === "all" && featured && (
        <Card className="relative mb-4 overflow-hidden p-5 sm:p-6" style={{ borderColor: `${tierOf(featured.rarity).color}55` }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 120% at 100% 0%, ${tierOf(featured.rarity).color}22, transparent 60%)` }} />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="text-6xl">{featured.icon}</div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><Pill tone="gold">Featured Lab Research</Pill><RarityPill id={featured.rarity} /></div>
              <div className="mt-2 font-display text-2xl font-bold">{featured.title}</div>
              <div className="mt-1 text-sm text-muted">{featured.tagline} By {featured.sellerAvatar} {featured.sellerName} · {featured.sales.toLocaleString()} heroes own it.</div>
            </div>
            <div className="flex items-center gap-4">
              {featured.verified?.grade && <GradeBadge grade={featured.verified.grade} size={72} />}
              <Button onClick={() => setOpen(featured)}>View <ArrowRight size={15} /></Button>
            </div>
          </div>
        </Card>
      )}

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-max rounded-xl border border-line bg-surface-2 p-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition", tab === t.id ? "bg-surface-3 text-ink shadow-sm" : "text-muted hover:text-ink")}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === "wallet" ? (
        <Wallet />
      ) : (
        <>
          {tab !== "all" && tab !== "library" && tab !== "selling" && <p className="-mt-1 mb-3 text-sm text-muted">{KIND_META[tab].blurb}</p>}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search strategies, setups, sellers, tags…" className="pl-9" /></div>
            <Select value={price} onChange={(e) => setPrice(e.target.value as PriceFilter)} className="sm:w-40" aria-label="Price filter"><option value="any">Any price</option><option value="gold">Buyable with Gold</option><option value="usd">Card or crypto</option><option value="free">Free</option></Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="sm:w-44" aria-label="Sort"><option value="trending">Trending</option><option value="verified">Best verified record</option><option value="rating">Top rated</option><option value="new">Newest</option><option value="price-low">Lowest price</option></Select>
          </div>
          {shown.length === 0 ? (
            <Card><Empty icon={tab === "selling" ? "🏪" : "🎒"} title={tab === "selling" ? "Nothing listed yet" : tab === "library" ? "Your library is empty" : "No matches"} body={tab === "selling" ? "Build a strategy in the AI Strategy Lab, grade it, then publish it here. You keep 85% of every sale." : tab === "library" ? "Everything you buy or claim lands here, and strategies also appear in your Lab." : "Try another search or filter."} action={tab === "selling" ? <Link href="/strategy-lab"><Button>Open Strategy Lab</Button></Link> : undefined} /></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {shown.map((l) => <ListingCard key={l.id} l={l} owned={owned.has(l.id) || l.sellerId === me?.id} onOpen={() => setOpen(l)} />)}
            </div>
          )}
        </>
      )}

      <Link href="/referrals" className="mt-6 flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/5 p-4 transition hover:bg-violet/10">
        <Gift className="shrink-0 text-violet" />
        <div className="flex-1 text-sm"><b>Invite a friend, both of you win.</b> <span className="text-muted">They get 15% off Premium or Ultra. You get 500 Gold when they journal 10 trades, plus a share of what they pay.</span></div>
        <ArrowRight size={16} className="text-muted" />
      </Link>

      {open && <ListingModal l={open} owned={owned.has(open.id) || open.sellerId === me?.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ListingCard({ l, owned, onOpen }: { l: Listing; owned: boolean; onOpen: () => void }) {
  const t = tierOf(l.rarity);
  return (
    <button onClick={onOpen} className="card group flex cursor-pointer flex-col p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: `${t.color}40`, boxShadow: `0 10px 30px -18px ${t.color}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl" style={{ background: `radial-gradient(circle, ${t.color}30, transparent 70%)` }}>{l.icon}</div>
        <div className="flex flex-col items-end gap-1">
          <RarityPill id={l.rarity} />
          {l.verified?.grade && <span className="font-display text-sm font-black" style={{ color: tierOf(l.rarity).color }}>{l.verified.grade}</span>}
        </div>
      </div>
      <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-[.08em] text-faint">{KIND_META[l.kind].icon} {KIND_META[l.kind].label}</div>
      <div className="mt-0.5 font-semibold leading-tight group-hover:text-accent">{l.title}</div>
      <div className="mt-1 line-clamp-2 text-xs text-muted">{l.tagline}</div>
      {l.verified?.liveTrades && <div className="mt-2 flex items-center gap-1 text-[11px] text-cyan"><BadgeCheck size={12} /> {l.verified.liveTrades} live trades · PF {l.verified.livePf?.toFixed(1)}</div>}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div>
          <div className="text-[11px] text-muted">{l.sellerAvatar} {l.sellerName}</div>
          <div className="flex items-center gap-1 text-[11px] text-faint">{l.reviews ? <><Star size={11} className="fill-gold text-gold" /> {l.rating.toFixed(1)} · {l.sales.toLocaleString()} sold</> : "New"}</div>
        </div>
        {owned ? <Pill tone="profit"><Check size={11} /> Owned</Pill> : <PriceTag gold={l.priceGold} usd={l.priceUsd} />}
      </div>
    </button>
  );
}

function ListingModal({ l, owned, onClose }: { l: Listing; owned: boolean; onClose: () => void }) {
  const { balance } = useGold();
  const [method, setMethod] = useState<PayMethod>(l.priceGold ? "gold" : "card");
  const [asset, setAsset] = useState<CryptoAsset>("USDT");
  const [network, setNetwork] = useState("TRON");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const free = !l.priceGold && !l.priceUsd;
  const rob = useMemo(() => (l.payload.spec ? auditStrategy(l.payload.spec, (a) => syntheticSeries(a, 2000, 1)) : null), [l.payload.spec]);
  const available = PAY_METHODS.filter((m) => (m.id === "gold" ? l.priceGold > 0 : l.priceUsd > 0));

  async function buy() {
    setBusy(true);
    setError("");
    const res = free
      ? ({ ok: true, ref: "FREE", method: "gold", amountGold: 0, amountUsd: 0, at: new Date().toISOString() } as Receipt)
      : await demoPayments.checkout({ method, amountUsd: l.priceUsd, amountGold: l.priceGold, crypto: method === "crypto" ? { asset, network } : undefined, description: l.title }, balance);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    useMarket.getState().recordPurchase(l.id, res);
    setReceipt(res);
  }

  return (
    <Modal open onClose={onClose} wide title={<span className="flex items-center gap-2">{l.icon} {l.title}</span>}>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><RarityPill id={l.rarity} /><Pill>{KIND_META[l.kind].icon} {KIND_META[l.kind].label}</Pill>{l.markets.map((m) => <Pill key={m} tone="cyan">{m}</Pill>)}</div>
          <p className="mt-3 text-sm leading-relaxed">{l.description}</p>
          <div className="mt-3 text-xs text-muted">By {l.sellerAvatar} <b className="text-ink">{l.sellerName}</b> · {l.reviews ? <>★ {l.rating.toFixed(1)} from {l.reviews} reviews · </> : null}{l.sales.toLocaleString()} sold</div>

          {l.verified?.liveTrades && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[["Live trades", String(l.verified.liveTrades)], ["Win rate", `${Math.round((l.verified.liveWinRate ?? 0) * 100)}%`], ["Profit factor", (l.verified.livePf ?? 0).toFixed(2)]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-cyan/30 bg-cyan/5 p-2.5"><div className="text-[10px] font-semibold uppercase tracking-wider text-cyan">{k}</div><div className="num text-lg font-semibold">{v}</div></div>
              ))}
              <div className="col-span-3 flex items-center gap-1.5 text-[11px] text-cyan"><ShieldCheck size={12} /> Verified from the seller&apos;s synced exchange journal, not self-reported.</div>
            </div>
          )}

          {l.payload.spec && rob && (
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
              <div className="flex items-center gap-3">
                <GradeBadge grade={rob.grade} score={rob.score} size={64} />
                <div className="text-xs text-muted">Your own Lab re-ran it just now{l.verified?.grade ? <> (seller&apos;s grade: <b className="text-ink">{l.verified.grade}</b>)</> : null}. {rob.checks.filter((c) => c.pass).length} of 6 robustness checks pass. The prototype re-runs on demo data; the live build re-grades on the same real history the seller used, so a grade can&apos;t be faked.</div>
              </div>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-[.08em] text-muted">Rules</div>
              <p className="mt-1 text-sm">{owned ? explainSpec(l.payload.spec) : `${explainSpec(l.payload.spec).split(".")[0].replace(/\d+(\.\d+)?/g, "•")}… Full rules unlock after purchase.`}</p>
            </div>
          )}
          {l.payload.setup && (
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">Playbook checklist</div>
              <ol className="mt-1.5 space-y-1 text-sm">{l.payload.setup.rules.map((r, i) => <li key={i} className={cn(!owned && i > 1 && "select-none blur-[4px]")}>{i + 1}. {r}</li>)}</ol>
            </div>
          )}
          {l.payload.skill && (
            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">{l.payload.skill.lessons.length} techniques</div>
              <ul className="mt-1.5 space-y-1 text-sm">{l.payload.skill.lessons.map((x) => <li key={x}>📜 {x}</li>)}</ul>
            </div>
          )}
          {l.payload.item && <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-sm">Effect: <b>{l.payload.item.effect}</b>. Cosmetic only, it never changes your stats.</div>}
        </div>

        <div className="space-y-3">
          {receipt || owned ? (
            <Card className="border-profit/40 p-4">
              <div className="flex items-center gap-2 font-semibold text-profit"><Check size={16} /> {receipt ? "Purchase complete" : "In your library"}</div>
              {receipt && <div className="mt-2 space-y-0.5 text-xs text-muted">
                <div>Receipt <span className="num text-ink">{receipt.ref}</span></div>
                {receipt.amountGold > 0 && <div>Paid 🪙 {receipt.amountGold.toLocaleString()} Gold</div>}
                {receipt.amountUsd > 0 && <div>Paid ${receipt.amountUsd.toFixed(2)} by {receipt.method}</div>}
                {receipt.address && <div className="break-all">Invoice address <span className="num">{receipt.address}</span> (demo)</div>}
              </div>}
              <div className="mt-3 text-sm">
                {l.kind === "strategy" && <Link href="/strategy-lab" className="font-semibold text-accent">Open it in your Strategy Lab →</Link>}
                {l.kind === "setup" && <Link href="/arsenal" className="font-semibold text-accent">Equip it in your Arsenal →</Link>}
                {(l.kind === "skill" || l.kind === "item") && <span className="text-muted">Find it under My library.</span>}
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <PriceTag gold={l.priceGold} usd={l.priceUsd} className="text-xl" />
              {!free && (
                <>
                  <Label>Pay with</Label>
                  <div className="space-y-1.5">
                    {available.map((m) => (
                      <button key={m.id} onClick={() => setMethod(m.id)} className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left", method === m.id ? "border-accent/60 bg-accent/5" : "border-line hover:border-line-strong")}>
                        <span className="text-xl">{m.icon}</span>
                        <span className="flex-1"><span className="block text-sm font-semibold">{m.label}{m.id === "gold" && <span className="num ml-2 text-xs font-normal text-gold">balance {balance.toLocaleString()}</span>}</span><span className="block text-[11px] text-muted">{m.sub}</span></span>
                        <span className="num text-sm font-semibold">{m.id === "gold" ? `🪙 ${l.priceGold.toLocaleString()}` : `$${l.priceUsd}`}</span>
                      </button>
                    ))}
                  </div>
                  {method === "crypto" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div><Label>Coin</Label><Select value={asset} onChange={(e) => { const a = e.target.value as CryptoAsset; setAsset(a); setNetwork(CRYPTO_ASSETS.find((x) => x.id === a)!.networks[0]); }}>{CRYPTO_ASSETS.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}</Select></div>
                      <div><Label>Network</Label><Select value={network} onChange={(e) => setNetwork(e.target.value)}>{CRYPTO_ASSETS.find((x) => x.id === asset)!.networks.map((n) => <option key={n}>{n}</option>)}</Select></div>
                    </div>
                  )}
                </>
              )}
              {error && <div className="mt-3 rounded-lg border border-loss/30 bg-loss/10 p-2.5 text-xs text-loss">{error} {method === "gold" && <Link href="/shop?tab=wallet" className="underline" onClick={onClose}>How to earn Gold</Link>}</div>}
              <Button className="mt-4 w-full" size="lg" onClick={buy} disabled={busy}>{busy ? "Processing…" : free ? "Claim for free" : method === "gold" ? `Buy for ${l.priceGold.toLocaleString()} Gold` : method === "card" ? `Pay $${l.priceUsd} with card` : `Pay $${l.priceUsd} in ${asset}`}</Button>
              <p className="mt-2 text-[11px] text-faint">Demo checkout, no money moves. Live: Stripe for cards, Coinbase Commerce for crypto. 7-day refund if it doesn&apos;t match its listing. Seller keeps {Math.round(CREATOR_SHARE * 100)}%.</p>
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Wallet() {
  const { balance, earned, spent, sources, history } = useGold();
  const listings = useMarket((s) => s.listings);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Gold balance</div>
        <div className="num mt-1 font-display text-4xl font-bold text-gold">🪙 {balance.toLocaleString()}</div>
        <div className="mt-1 text-xs text-muted">{earned.toLocaleString()} earned · {spent.toLocaleString()} spent</div>
        <p className="mt-4 text-sm text-muted">Gold is earned, never bought. It rewards good trading habits, so a free hero can unlock real tools by playing well. Sellers can cash out Gold sales at 100 Gold = $1.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/journal"><Button size="sm" variant="outline">Journal a trade</Button></Link>
          <Link href="/academy"><Button size="sm" variant="outline">Finish a lesson</Button></Link>
          <Link href="/referrals"><Button size="sm">Invite a friend</Button></Link>
        </div>
      </Card>
      <Card>
        <CardHeader title="Where your Gold comes from" />
        <div className="space-y-1 px-5 pb-4">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-2">
              <div><div className="text-sm font-medium">{s.label}</div><div className="text-[11px] text-faint">{s.hint}</div></div>
              <div className="num text-sm font-semibold text-gold">+{s.gold.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Recent activity" />
        <div className="px-5 pb-5">
          {history.length === 0 ? <div className="text-sm text-muted">No purchases yet.</div> : history.slice(0, 12).map((h) => (
            <div key={h.id} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <span>{h.reason}<span className="ml-2 text-[11px] text-faint">{new Date(h.at).toLocaleDateString()}</span></span>
              <span className={cn("num font-semibold", h.gold < 0 ? "text-loss" : "text-gold")}>{h.gold > 0 ? "+" : ""}{h.gold.toLocaleString()}</span>
            </div>
          ))}
          <div className="mt-3 text-[11px] text-faint">{listings.length} listings in the shop right now.</div>
        </div>
      </Card>
    </div>
  );
}
