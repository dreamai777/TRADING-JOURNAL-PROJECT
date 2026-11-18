import { Suspense } from "react";
import { AppShell } from "@/components/shell";
import { Logo } from "@/components/logo";

// The journal is client-data driven (local store now, Supabase later), so the app area streams
// behind a branded fallback instead of being prerendered with stale data.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Logo size={40} />
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
