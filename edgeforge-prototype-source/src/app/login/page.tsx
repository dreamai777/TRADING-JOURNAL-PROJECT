"use client";
import { Crown, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, Input, Label, Segmented } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.sessionUserId);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const next = () => {
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") ? n : "/dashboard";
  };

  useEffect(() => {
    if (hydrated && session) router.replace(next());
  }, [hydrated, session, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const s = useStore.getState();
    const res = mode === "login" ? s.login(email, password) : s.signup(name || email.split("@")[0], email, password);
    if (!res.ok) setError(res.error);
  }

  function demo(as: "trader" | "admin") {
    const r = useStore.getState().login(as === "trader" ? "trader@demo.gg" : "admin@demo.gg", "demo1234");
    if (!r.ok) setError(r.error);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-bg relative hidden overflow-hidden border-r border-line lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_30%,rgba(200,245,59,.12),transparent_70%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/"><Logo /></Link>
          <div>
            <div className="font-display text-5xl font-bold leading-[1.05]">
              Every trade is XP.<br />
              <span className="text-accent">Forge your edge.</span>
            </div>
            <p className="mt-5 max-w-md text-muted">Journal in one snap, sync your exchanges, and watch your setups level up from Common to Legendary as you prove your edge.</p>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[["🗡️", "Arsenal", "Setups as weapons"], ["📈", "Analytics", "40+ metrics"], ["🧠", "Mindset", "Tilt detection"]].map(([i, t, s]) => (
                <div key={t} className="card p-3">
                  <div className="text-2xl">{i}</div>
                  <div className="mt-2 text-sm font-semibold">{t}</div>
                  <div className="text-[11px] text-muted">{s}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-faint">Prototype build · data stays in your browser</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-display text-2xl font-bold">{mode === "login" ? "Welcome back, trader" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted">{mode === "login" ? "Log in to your command center." : "Start at Recruit. Level up from there."}</p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button onClick={() => demo("trader")} className="card flex cursor-pointer items-center gap-2.5 p-3 text-left transition hover:border-accent/50">
              <UserIcon size={18} className="text-accent" />
              <div>
                <div className="text-sm font-semibold">Demo trader</div>
                <div className="text-[11px] text-muted">2 years of trades</div>
              </div>
            </button>
            <button onClick={() => demo("admin")} className="card flex cursor-pointer items-center gap-2.5 p-3 text-left transition hover:border-gold/50">
              <Crown size={18} className="text-gold" />
              <div>
                <div className="text-sm font-semibold">Demo admin</div>
                <div className="text-[11px] text-muted">Admin console</div>
              </div>
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-faint">
            <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
          </div>

          <Segmented value={mode} onChange={(m) => { setMode(m); setError(""); }} options={[{ value: "login", label: "Log in" }, { value: "signup", label: "Sign up" }]} className="mb-5 w-full [&>button]:flex-1" />

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label>Trader name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NightOwl" />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>
            {error && <div className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</div>}
            <Button type="submit" className="w-full" size="lg">{mode === "login" ? "Log in" : "Create account"}</Button>
          </form>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {["Google", "Apple", "Discord"].map((p) => (
              <button key={p} disabled title="Enabled once Supabase OAuth keys are added" className="h-10 cursor-not-allowed rounded-lg border border-line text-xs font-semibold text-faint">
                {p}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-faint">Demo accounts: trader@demo.gg / admin@demo.gg · password demo1234</p>
        </div>
      </div>
    </div>
  );
}
