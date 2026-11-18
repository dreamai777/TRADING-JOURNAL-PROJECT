"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(() => useStore.setState({ hydrated: true }));
  }, []);
  return <>{children}</>;
}
