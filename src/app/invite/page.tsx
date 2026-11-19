"use client";
import { Gift } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { FRIEND_DISCOUNT, FRIEND_DISCOUNT_MONTHS, FRIEND_WELCOME_GOLD, discounted, isValidCode } from "@/core/referral";
import { useMarket } from "@/lib/market-store";

// Landing for invite links (/invite?code=NAME-XXXX). Stores the code so it is applied at signup
// (welcome Gold) and at checkout (15% off the first months of Premium or Ultra).
export default function InvitePage() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    Promise.resolve(useMarket.persist.rehydrate()).then(() => {
      const c = (new URLSearchParams(window.location.search).get("code") ?? "").toUpperCase();
      if (isValidCode(c)) useMarket.getState().captureReferral(c);
      setCode(isValidCode(c) ? c : "");
    });
  }, []);
  const host = code ? code.split("-")[0].charAt(0) + code.split("-")[0].slice(1).toLowerCase() : "";

  return (
    <div className="grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_30%,rgba(167,139,250,.2),transparent_70%)]" />
      <div className="card relative w-full max-w-lg p-7 text-center sm:p-9">
        <div className="flex justify-center"><Logo /></div>
        {code === null ? (
          <div className="mt-10 h-24" />
        ) : code ? (
          <>
            <div className="mt-8 text-5xl">⚔️</div>
            <h1 className="mt-4 font-display text-3xl font-bold">{host} invited you to their party</h1>
            <p className="mt-3 text-muted">Journal every trade, level up a hero, and find your real edge. Your invite unlocks:</p>
            <div className="mt-6 grid gap-2 text-left">
              <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 p-3"><Gift className="shrink-0 text-accent" size={20} /><div><b>{Math.round(FRIEND_DISCOUNT * 100)}% off</b> your first {FRIEND_DISCOUNT_MONTHS} months: Premium ${discounted(19, true)}/mo, Ultra ${discounted(49, true)}/mo</div></div>
              <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/5 p-3"><span className="text-xl">🪙</span><div><b>{FRIEND_WELCOME_GOLD} Gold</b> welcome pack for the Hero Shop</div></div>
            </div>
            <div className="num mt-5 text-xs text-faint">Code {code} saved on this device</div>
            <Link href="/login?next=/referrals" className="mt-5 block"><Button size="lg" className="w-full">Claim and create my hero</Button></Link>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-2xl font-bold">This invite link looks broken</h1>
            <p className="mt-2 text-muted">Ask your friend to copy their link again. You can still start free.</p>
            <Link href="/login" className="mt-6 block"><Button size="lg" className="w-full">Start free</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
