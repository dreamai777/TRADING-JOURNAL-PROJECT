export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#0f1519" stroke="#c8f53b" strokeOpacity=".5" />
        <path d="M8 21.5 13.5 14l4 4.5L24 9.5" stroke="#c8f53b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.5 9.5H24V14" stroke="#c8f53b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="21.5" r="1.8" fill="#2fe39a" />
      </svg>
      {withText && (
        <span className="font-display text-[17px] font-bold tracking-tight">
          Edge<span className="text-accent">Forge</span>
        </span>
      )}
    </div>
  );
}
