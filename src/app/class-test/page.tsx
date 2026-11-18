"use client";
import Link from "next/link";
import { useState } from "react";
import { ClassTestFlow, TestResultView } from "@/components/class-test";
import { CharacterSprite } from "@/components/character-sprite";
import { GlowTracker } from "@/components/landing/glow";
import { Logo } from "@/components/logo";
import { QUESTIONS, TRADER_TYPES, type TestResult } from "@/core/trader-test";
import { useStore } from "@/lib/store";

export default function ClassTestPage() {
  const save = useStore((s) => s.saveTestResult);
  const session = useStore((s) => s.sessionUserId);
  const [stage, setStage] = useState<"intro" | "test" | "done">("intro");
  const [result, setResult] = useState<TestResult | null>(null);

  return (
    <div className="grid-bg min-h-screen">
      <GlowTracker />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/"><Logo /></Link>
        <Link href={session ? "/profile" : "/login"} className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold">{session ? "My character" : "Log in"}</Link>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {stage === "intro" && (
          <div className="mx-auto max-w-2xl pt-8 text-center">
            <div className="flex items-end justify-center gap-2">
              {Object.values(TRADER_TYPES).map((t, k) => <CharacterSprite key={t.id} job={t.job} condition="strong" size={k === 2 || k === 3 ? 96 : 72} tier={1} />)}
            </div>
            <div className="mt-6 text-[11px] font-bold uppercase tracking-[.25em] text-accent">Trader Class Test</div>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">What kind of trader are you?</h1>
            <p className="mx-auto mt-4 max-w-xl text-muted">{QUESTIONS.length} quick questions, about 3 minutes. Find your style (scalper, day trader, momentum, swing, position or investor), see your strengths and weaknesses on a chart, and get a study path and setups built for you.</p>
            <button onClick={() => setStage("test")} className="chrome mt-8 rounded-xl bg-accent px-7 py-3.5 font-bold text-accent-ink shadow-[0_14px_50px_-12px_rgba(200,245,59,.9)]">Start the test</button>
            <div className="mt-3 text-xs text-faint">Free. Answer honestly: the result only helps if it&apos;s true.</div>
          </div>
        )}
        {stage === "test" && (
          <div className="pt-6">
            <ClassTestFlow onDone={(r) => { setResult(r); save(r); setStage("done"); window.scrollTo({ top: 0 }); }} />
          </div>
        )}
        {stage === "done" && result && (
          <div className="pt-4">
            <TestResultView r={result} onRetake={() => setStage("test")} />
            {!session && <p className="mt-4 text-center text-xs text-muted">Your result is saved on this device and moves to your account when you sign up or log in.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
