"use client";
import { useMemo, useState } from "react";
import { academyXp } from "@/core/academy";
import { traderProgress } from "@/core/game";
import { computeAll, sliceRange, summarize } from "@/core/stats";
import { useMe, useStore } from "./store";

export function useJournal() {
  const me = useMe();
  const allTrades = useStore((s) => s.trades);
  const allSetups = useStore((s) => s.setups);
  return useMemo(() => {
    const id = me?.id;
    const trades = computeAll(allTrades.filter((t) => t.userId === id));
    const setups = allSetups.filter((s) => s.userId === id);
    const account = me?.accountSize ?? 10000;
    const bonusXp = academyXp({ trades, setups, testTaken: !!me?.traderProfile, lessonsDone: me?.lessonsDone ?? [] });
    return { me, trades, setups, account, bonusXp, summary: summarize(trades, account), progress: traderProgress(trades, bonusXp) };
  }, [me, allTrades, allSetups]);
}

/** Journal sliced to the globally selected time range (1D … 2Y, All). */
export function useRangedJournal() {
  const j = useJournal();
  const range = useStore((s) => s.range);
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    const { trades, startEquity } = sliceRange(j.trades, range, j.account, now);
    return { ...j, all: j.trades, trades, startEquity, range, summary: summarize(trades, startEquity) };
  }, [j, range, now]);
}
