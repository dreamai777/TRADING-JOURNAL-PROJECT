"use client";
import { useEffect } from "react";
import { useAi } from "@/lib/ai";
import { useStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(() => useStore.setState({ hydrated: true }));
    void useAi.persist.rehydrate();
  }, []);
  return <>{children}</>;
}
