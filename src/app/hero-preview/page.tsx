import Link from "next/link";
import { HeroStage3D } from "@/components/hero-stage-3d";
import { Logo } from "@/components/logo";
import { HERO_PARTY } from "@/core/hero-models";

export const metadata = { title: "Hero party · 3D preview · EdgeForge" };

export default function HeroPreviewPage() {
  return (
    <div className="relative h-[100svh] min-h-[560px] overflow-hidden bg-bg">
      <HeroStage3D className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/"><Logo /></Link>
        <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur">3D preview · stand-in models · click a hero</span>
      </header>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex flex-wrap justify-center gap-2 px-4">
        {HERO_PARTY.map((h) => (
          <span key={h.job} className="rounded-lg bg-black/45 px-3 py-1.5 text-xs text-white backdrop-blur"><b>{h.name}</b> · {h.role}</span>
        ))}
      </div>
    </div>
  );
}
