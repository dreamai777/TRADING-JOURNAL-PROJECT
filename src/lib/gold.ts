"use client";
import { useMemo } from "react";
import { LESSONS } from "@/core/academy";
import { badges } from "@/core/game";
import { referralTotals } from "@/core/referral";
import { goldEarned, perfectQuestDays } from "@/core/shop";
import { useJournal } from "./hooks";
import { useMarket } from "./market-store";

/** Every new hero starts with a welcome purse so the shop is usable on day one. */
export const WELCOME_GOLD = 1000;

/** Gold balance = earned from play (derived from the journal) + ledger grants − ledger spends. */
export function useGold() {
  const { me, trades, setups, progress } = useJournal();
  const ledger = useMarket((s) => s.ledger);
  const referrals = useMarket((s) => s.referrals);
  return useMemo(() => {
    const id = me?.id;
    const mine = ledger.filter((g) => g.userId === id);
    const refs = referralTotals(referrals.filter((r) => r.referrerId === id));
    const trophies = badges(trades, setups, { testTaken: !!me?.traderProfile, lessonsDone: me?.lessonsDone?.length ?? 0, freeLessons: LESSONS.filter((l) => l.tier === "free").length });
    const grants = mine.filter((g) => g.gold > 0 && !g.reason.startsWith("Sale:")).reduce((a, g) => a + g.gold, 0);
    const sales = mine.filter((g) => g.reason.startsWith("Sale:")).reduce((a, g) => a + g.gold, 0);
    const sources = goldEarned({ xp: progress.xp, badges: trophies, lessonsDone: me?.lessonsDone?.length ?? 0, questDays: perfectQuestDays(trades), referralGold: refs.totalGold, salesGold: sales, bonus: WELCOME_GOLD + grants });
    const earned = sources.reduce((a, s) => a + s.gold, 0);
    const spent = -mine.filter((g) => g.gold < 0).reduce((a, g) => a + g.gold, 0);
    return { balance: earned - spent, earned, spent, sources, history: [...mine].reverse() };
  }, [me, trades, setups, progress.xp, ledger, referrals]);
}
