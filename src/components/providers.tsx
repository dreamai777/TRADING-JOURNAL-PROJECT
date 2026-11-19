"use client";
import { useEffect } from "react";
import { useAi } from "@/lib/ai";
import { useMarket } from "@/lib/market-store";
import { useStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Promise.all([useStore.persist.rehydrate(), useMarket.persist.rehydrate()]).finally(() => useStore.setState({ hydrated: true }));
    void useAi.persist.rehydrate();
  }, []);
  return <>{children}</>;
}
