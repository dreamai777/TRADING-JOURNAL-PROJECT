"use client";
import { Check, Copy, Gift, Mail, Send, Share2, Users } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { GoldChip } from "@/components/shop/gold";
import { Button, Card, CardHeader, Input, Label, PageHeader, Pill, Progress, cn } from "@/components/ui";
import { ACTIVATION_TRADES, ACTIVE_FRIEND_GOLD, FRIEND_DISCOUNT, FRIEND_DISCOUNT_MONTHS, FRIEND_WELCOME_GOLD, REFERRAL_RANKS, discounted, inviteLink, monthlyShareGold, referralCode, referralTotals, type ReferralStatus } from "@/core/referral";
import { useJournal } from "@/lib/hooks";
import { useMarket } from "@/lib/market-store";

const PLANS = [
  { id: "premium", name: "Premium", price: 19, color: "#c8f53b" },
  { id: "ultra", name: "Ultra", price: 49, color: "#fbbf24" },
] as const;

const STATUS: Record<ReferralStatus, { label: string; tone: "neutral" | "cyan" | "profit" | "gold" }> = {
  invited: { label: "Invited", tone: "neutral" },
  joined: { label: "Joined", tone: "cyan" },
  active: { label: `Active (${ACTIVATION_TRADES}+ trades)`, tone: "profit" },
  paid: { label: "Subscribed", tone: "gold" },
};

export default function ReferralsPage() {
  const { me } = useJournal();
  const referrals = useMarket((s) => s.referrals);
  const usedReferral = useMarket((s) => s.usedReferral);
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "https://edgeforge.app");
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const [email, setEmail] = useState("");
  const [calcFriends, setCalcFriends] = useState(5);
  const [calcPlan, setCalcPlan] = useState<"premium" | "ultra">("premium");

  const mine = useMemo(() => referrals.filter((r) => r.referrerId === me?.id), [referrals, me?.id]);
  const totals = referralTotals(mine);
  if (!me) return null;
  const code = referralCode(me);
  const link = inviteLink(origin, code);
  const shareText = `I level up my trading with EdgeForge, a journal that plays like an RPG. Join my party and get ${Math.round(FRIEND_DISCOUNT * 100)}% off Premium:`;
  const myCode = usedReferral[me.id];

  async function copy(what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : link);
    } catch {}
    setCopied(what);
    setTimeout(() => setCopied(""), 1800);
  }
  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: "Join my party on EdgeForge", text: shareText, url: link }); } catch {}
    } else copy("link");
  }
  function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    useMarket.getState().invite(email.trim());
    setEmail("");
  }

  const enc = encodeURIComponent;
  const SOCIAL = [
    { name: "X", href: `https://x.com/intent/post?text=${enc(shareText)}&url=${enc(link)}`, bg: "#000" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, bg: "#1877f2" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`, bg: "#0a66c2" },
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${shareText} ${link}`)}`, bg: "#25d366" },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(shareText)}`, bg: "#229ed9" },
    { name: "Email", href: `mailto:?subject=${enc("Join my party on EdgeForge")}&body=${enc(`${shareText} ${link}`)}`, bg: "#475569" },
  ];

  const calcRank = REFERRAL_RANKS.filter((r) => calcFriends >= r.minActive).at(-1)!;
  const calcPrice = discounted(PLANS.find((p) => p.id === calcPlan)!.price, true);
  const calcMonthly = calcFriends * monthlyShareGold(calcPrice, calcRank);

  return (
    <div>
      <PageHeader title="Invite Friends" subtitle="Recruit your party. Friends get 15% off, you earn Gold and a share of what they pay." right={<GoldChip className="sm:hidden" />} />

      {myCode && <div className="mb-4 rounded-xl border border-profit/30 bg-profit/5 p-3 text-sm">🎁 You joined with invite code <b className="num">{myCode}</b>: {Math.round(FRIEND_DISCOUNT * 100)}% off your first {FRIEND_DISCOUNT_MONTHS} months of Premium or Ultra is applied, and your {FRIEND_WELCOME_GOLD} Gold welcome pack is in your wallet.</div>}

      <Card className="relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_100%_0%,rgba(167,139,250,.18),transparent_60%),radial-gradient(50%_80%_at_0%_100%,rgba(200,245,59,.10),transparent_60%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Pill tone="violet"><Gift size={12} /> Double-sided rewards</Pill>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">Give <span className="text-accent">15% off</span>.<br />Get <span className="text-gold">{ACTIVE_FRIEND_GOLD} Gold</span> + up to 25% back.</h2>
            <p className="mt-3 max-w-lg text-sm text-muted">Your friend saves {Math.round(FRIEND_DISCOUNT * 100)}% on their first {FRIEND_DISCOUNT_MONTHS} months of Premium (${discounted(19, true)}/mo) or Ultra (${discounted(49, true)}/mo), plus a {FRIEND_WELCOME_GOLD} Gold welcome pack. You get {ACTIVE_FRIEND_GOLD} Gold once they journal {ACTIVATION_TRADES} trades, then a share of every payment for 12 months.</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Your code</Label>
              <div className="flex gap-2">
                <div className="num flex h-12 flex-1 items-center rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 px-4 font-display text-xl font-bold tracking-wider text-accent">{code}</div>
                <Button variant="outline" className="h-12" onClick={() => copy("code")} aria-label="Copy code">{copied === "code" ? <Check size={16} /> : <Copy size={16} />}</Button>
              </div>
            </div>
            <div>
              <Label>Your link</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} className="num text-xs" onFocus={(e) => e.target.select()} aria-label="Invite link" />
                <Button onClick={() => copy("link")}>{copied === "link" ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={nativeShare}><Share2 size={13} /> Share</Button>
              {SOCIAL.map((s) => <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-white transition hover:brightness-110" style={{ background: s.bg }}>{s.name}</a>)}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[["Invited", totals.invited], ["Joined", totals.joined], ["Active", totals.active], ["Subscribed", totals.paid], ["Gold earned", totals.totalGold.toLocaleString()]].map(([k, v], i) => (
          <Card key={k} className={cn("p-4", i === 4 && "col-span-2 lg:col-span-1")}>
            <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">{k}</div>
            <div className={cn("num mt-1 text-2xl font-semibold", i === 4 && "text-gold")}>{i === 4 ? `🪙 ${v}` : v}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title="Recruiter rank" icon={<span>{totals.rank.icon}</span>} subtitle={`${totals.rank.name} · ${Math.round(totals.rank.revShare * 100)}% revenue share`} />
          <div className="px-5 pb-5">
            {totals.next && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted"><span>{totals.active} active friends</span><span>{totals.next.icon} {totals.next.name} at {totals.next.minActive}</span></div>
                <Progress value={totals.active / totals.next.minActive} color="#a78bfa" className="mt-1.5" />
              </div>
            )}
            <div className="space-y-1.5">
              {REFERRAL_RANKS.map((r) => {
                const reached = totals.active >= r.minActive;
                return (
                  <div key={r.id} className={cn("flex items-center gap-3 rounded-xl border p-2.5", r.id === totals.rank.id ? "border-violet/50 bg-violet/5" : "border-line", !reached && "opacity-60")}>
                    <span className="text-xl">{r.icon}</span>
                    <div className="flex-1"><div className="text-sm font-semibold">{r.name} <span className="text-[11px] font-normal text-faint">{r.minActive ? `${r.minActive}+ active` : "Start"}</span></div><div className="text-[11px] text-muted">{r.perk}</div></div>
                    {reached && <Check size={15} className="text-profit" />}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold"><Mail size={15} /> Invite by email</div>
            <form onSubmit={sendInvite} className="mt-3 flex gap-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@email.com" aria-label="Friend's email" />
              <Button type="submit" disabled={!email}><Send size={14} /> Invite</Button>
            </form>
            <p className="mt-2 text-[11px] text-faint">Prototype: adds them to your party list. Live build sends a branded email with your code.</p>
          </Card>
          <Card className="p-5">
            <div className="text-[13px] font-semibold">Earnings calculator</div>
            <div className="mt-3 flex justify-between text-xs"><span>Friends who subscribe</span><span className="num font-semibold text-accent">{calcFriends}</span></div>
            <input type="range" min={1} max={30} value={calcFriends} onChange={(e) => setCalcFriends(+e.target.value)} className="w-full" aria-label="Friends who subscribe" />
            <div className="mt-2 flex gap-1.5">{PLANS.map((p) => <button key={p.id} onClick={() => setCalcPlan(p.id)} className={cn("flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold", calcPlan === p.id ? "border-accent/50 bg-accent/10" : "border-line text-muted")}>{p.name} ${discounted(p.price, true)}</button>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 p-3"><div className="text-[10.5px] uppercase tracking-wider text-muted">One-time</div><div className="num text-lg font-semibold text-gold">🪙 {(calcFriends * ACTIVE_FRIEND_GOLD).toLocaleString()}</div></div>
              <div className="rounded-xl bg-surface-2 p-3"><div className="text-[10.5px] uppercase tracking-wider text-muted">Per month ({calcRank.name})</div><div className="num text-lg font-semibold text-gold">🪙 {calcMonthly.toLocaleString()}</div></div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader title="Your party" icon={<Users size={15} />} subtitle={`${mine.length} invited`} />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="pb-2 font-semibold">Friend</th><th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold">Plan</th><th className="pb-2 text-right font-semibold">Your Gold</th></tr></thead>
            <tbody>
              {mine.map((r) => {
                const g = (r.status === "active" || r.status === "paid" ? ACTIVE_FRIEND_GOLD : 0) + (r.status === "paid" ? monthlyShareGold(r.monthlyUsd ?? 0, totals.rank) * Math.min(12, r.monthsPaid ?? 0) : 0);
                return (
                  <tr key={r.id} className="border-t border-line">
                    <td className="py-2.5"><div className="font-medium">{r.friendName}</div><div className="text-[11px] text-faint">{new Date(r.at).toLocaleDateString()}</div></td>
                    <td><Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill></td>
                    <td className="text-muted">{r.plan ? `${r.plan === "ultra" ? "Ultra" : "Premium"} · $${r.monthlyUsd}/mo · ${r.monthsPaid} mo` : "—"}</td>
                    <td className="num text-right font-semibold text-gold">{g ? `+${g.toLocaleString()}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-faint">Fair play: rewards unlock only after a friend journals {ACTIVATION_TRADES} real trades. Self-referrals, duplicate devices and refunded payments are reversed. Revenue share is paid in Gold for 12 months per friend and can be cashed out at 100 Gold = $1.</p>
        </div>
      </Card>
    </div>
  );
}
