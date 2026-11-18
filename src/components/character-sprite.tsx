"use client";
// Original chibi job-class characters drawn in SVG. Pose, face and effects follow the trader's condition.
import { useId } from "react";
import type { Condition } from "@/core/character";
import type { JobClass } from "@/core/types";

const SKIN = "#f1c7a0";
const JOB_GLOW: Record<JobClass, string> = { wizard: "#a78bfa", warrior: "#fb7a45", assassin: "#e879f9", archer: "#a3e635", defender: "#38bdf8", sniper: "#fbbf24" };
const SKIN_SHADE = "#d9a882";

const PALETTE: Record<JobClass, { body: string; trim: string; legs: string; boots: string }> = {
  wizard: { body: "#5b3fa8", trim: "#fbbf24", legs: "#3b2a7a", boots: "#2a1d55" },
  warrior: { body: "#b3bcc8", trim: "#c2410c", legs: "#5b6573", boots: "#3a2a20" },
  assassin: { body: "#2a2338", trim: "#e879f9", legs: "#1b1626", boots: "#120e1a" },
  archer: { body: "#2f6b3a", trim: "#a3e635", legs: "#5a4632", boots: "#3d2f22" },
  defender: { body: "#1e4f74", trim: "#38bdf8", legs: "#2c3e50", boots: "#1c2733" },
  sniper: { body: "#5a5a36", trim: "#fbbf24", legs: "#3f3f26", boots: "#2a2a18" },
};

/** tier: 0 = starter gear, 1 = adds a cape, 2 = legendary (gold trim, glowing weapon, crown). */
export function CharacterSprite({ job, condition, size = 120, tier = 0 }: { job: JobClass; condition: Condition; size?: number; tier?: 0 | 1 | 2 }) {
  const uid = useId().replace(/:/g, "");
  const p = PALETTE[job];
  const glow = JOB_GLOW[job];
  const sitting = condition === "resting" || condition === "burnout";
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" aria-hidden className="overflow-visible">
      <defs>
        {/* dark outline around the whole character for a crisp game-sprite look */}
        <filter id={`ol${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.1" result="d" />
          <feFlood floodColor="#06080c" />
          <feComposite in2="d" operator="in" result="o" />
          <feMerge><feMergeNode in="o" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* volume lighting: bevels each part and lights it from the top-left for a 3D, sculpted look */}
        <filter id={`v${uid}`} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b" />
          <feDiffuseLighting in="b" surfaceScale="4" diffuseConstant="1" lightingColor="#ffffff" result="d"><feDistantLight azimuth="235" elevation="38" /></feDiffuseLighting>
          <feComposite in="d" in2="SourceAlpha" operator="in" result="dm" />
          <feComposite in="SourceGraphic" in2="dm" operator="arithmetic" k1="1.3" k2="0.1" k3="0" k4="0" />
        </filter>
        <linearGradient id={`sh${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </linearGradient>
        <radialGradient id={`hd${uid}`} cx=".38" cy=".35" r=".75">
          <stop offset="0" stopColor="#fbe0c4" />
          <stop offset="1" stopColor={SKIN} />
        </radialGradient>
      </defs>
      {/* aura */}
      {condition === "onfire" && <ellipse className="char-aura" cx="50" cy="70" rx="34" ry="44" fill="#fbbf24" opacity=".35" style={{ filter: "blur(8px)" }} />}
      {condition === "strong" && <ellipse className="char-aura" cx="50" cy="70" rx="30" ry="40" fill="#2fe39a" opacity=".25" style={{ filter: "blur(8px)" }} />}
      {condition === "tilted" && <ellipse className="char-aura" cx="50" cy="70" rx="34" ry="44" fill="#ff5470" opacity=".4" style={{ filter: "blur(8px)" }} />}
      <ellipse cx="50" cy="113" rx="20" ry="3.5" fill="#000" opacity=".45" />
      {tier === 2 && <ellipse className="char-aura" cx="50" cy="112" rx="26" ry="5" fill="none" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="3 2" />}

      {!sitting && [0, 1].map((i) => <circle key={`d${i}`} className="char-dust" cx={42 + i * 8} cy="110" r="2.2" fill="#8593a5" opacity=".0" style={{ animationDelay: `${i * 0.25}s` }} />)}
      <g filter={`url(#ol${uid})`}>
      <g className={sitting ? "" : "char-bob"}>
        {/* cape (tier 1+) */}
        {tier >= 1 && job !== "wizard" && (
          <path className="char-cape" d={sitting ? "M38 70 Q30 92 26 108 L60 108 Q58 90 62 70Z" : "M38 60 Q30 84 28 104 Q44 100 60 104 Q60 84 62 60Z"} fill={tier === 2 ? "#7f1d1d" : p.legs} stroke={tier === 2 ? "#fbbf24" : "none"} strokeWidth="1" />
        )}
        {/* back weapon / gear */}
        {job === "archer" && (
          <g>
            <rect x="28" y="54" width="8" height="26" rx="2" fill="#6b4f2f" transform="rotate(-18 32 66)" />
            {[0, 1, 2].map((i) => <line key={i} x1={28 + i * 2.5} y1="52" x2={26 + i * 2.5} y2="46" stroke="#e5e7eb" strokeWidth="1.5" transform="rotate(-18 32 66)" />)}
          </g>
        )}
        {job === "sniper" && <rect x="20" y="60" width="62" height="5" rx="2" fill="#1f2328" transform="rotate(-28 50 62)" />}

        {/* legs */}
        <g filter={`url(#v${uid})`}>
        {sitting ? (
          <g>
            <rect x="38" y="96" width="24" height="8" rx="4" fill={p.legs} />
            <rect x="58" y="96" width="10" height="9" rx="3" fill={p.boots} />
          </g>
        ) : (
          <g>
            <g className="char-leg-b"><rect x="41" y="84" width="8" height="22" rx="3" fill={p.legs} /><rect x="40" y="102" width="11" height="7" rx="3" fill={p.boots} /></g>
            <g className="char-leg-a"><rect x="51" y="84" width="8" height="22" rx="3" fill={p.legs} /><rect x="50" y="102" width="11" height="7" rx="3" fill={p.boots} /></g>
          </g>
        )}
        </g>

        <g transform={sitting ? "translate(0 12)" : undefined}>
          <g filter={`url(#v${uid})`}>
          {/* back arm */}
          <rect x="33" y="60" width="7" height="20" rx="3.5" fill={p.body} opacity=".8" />
          {/* body */}
          {job === "wizard" ? (
            <path d="M38 58 h24 l6 32 h-36 z" fill={p.body} />
          ) : (
            <rect x="36" y="57" width="28" height="31" rx="8" fill={p.body} />
          )}
          {job === "wizard" ? (
            <path d="M38 58 h24 l6 32 h-36 z" fill={`url(#sh${uid})`} stroke={tier === 2 ? "#fbbf24" : "none"} strokeWidth="1.2" />
          ) : (
            <rect x="36" y="57" width="28" height="31" rx="8" fill={`url(#sh${uid})`} stroke={tier === 2 ? "#fbbf24" : "none"} strokeWidth="1.2" />
          )}
          {job === "warrior" && <path d="M44 58 h12 v30 h-12 z" fill={p.trim} />}
          {job !== "wizard" && tier >= 1 && (
            <g fill={tier === 2 ? "#fbbf24" : job === "warrior" || job === "defender" ? "#cbd5e1" : p.trim}>
              <path d="M31 62 Q33 54 41 56 L41 62 Q36 60 31 62Z" />
              <path d="M69 62 Q67 54 59 56 L59 62 Q64 60 69 62Z" />
            </g>
          )}
          {job === "defender" && <rect x="36" y="57" width="28" height="8" rx="4" fill="#9fb3c8" />}
          {job === "assassin" && <path d="M40 60 l10 10 l10 -10" stroke={p.trim} strokeWidth="2" fill="none" />}
          <rect x="36" y="78" width="28" height="4" fill="#00000055" />
          <rect x="47" y="78" width="6" height="4" fill={p.trim} />
          </g>

          {/* head */}
          {(job === "wizard" || job === "archer" || job === "sniper" || job === "warrior") && (
            <g fill={job === "wizard" ? "#cbd5e1" : "#5a3a24"}>
              <path d="M36 38 q-3 8 1 14 l3 -2 q-2 -6 0 -12z" />
              <path d="M66 38 q3 8 -1 14 l-3 -2 q2 -6 0 -12z" />
            </g>
          )}
          <circle cx="51" cy="42" r="15" fill={`url(#hd${uid})`} filter={`url(#v${uid})`} />
          {job === "wizard" && tier >= 1 && <path d="M42 50 Q51 66 60 50 Q56 54 51 54 Q46 54 42 50Z" fill="#e5e7eb" />}
          <circle cx="44" cy="46" r="2.4" fill={SKIN_SHADE} opacity=".6" />
          <Face condition={condition} job={job} />

          {/* headgear */}
          <g filter={`url(#v${uid})`}>
          {job === "wizard" && (
            <g>
              <path d="M33 33 Q51 24 69 33 L55 4 Q52 0 49 6 Z" fill="#3b2a7a" />
              <ellipse cx="51" cy="33" rx="20" ry="4" fill="#2a1d55" />
              <rect x="38" y="27" width="26" height="4" fill={p.trim} transform="rotate(-2 51 29)" />
              <path d="M54 16 l1.5 3 3 .4 -2.2 2 .6 3 -2.9 -1.5 -2.7 1.5 .5 -3 -2.2 -2 3 -.4z" fill={p.trim} />
            </g>
          )}
          {job === "warrior" && (
            <g>
              <path d="M35 40 Q35 24 51 24 Q67 24 67 40 L67 36 Q51 31 35 36 Z" fill="#9aa4b2" />
              <path d="M35 36 Q51 30 67 36 L67 40 Q51 35 35 40Z" fill="#7b8592" />
              {tier < 2 && <path d="M51 24 Q47 12 56 8 Q54 16 60 20 Q56 22 51 24" fill={p.trim} />}
            </g>
          )}
          {job === "assassin" && (
            <g>
              <path d="M34 46 Q32 24 51 24 Q70 24 68 46 Q66 32 51 32 Q37 32 34 46Z" fill="#1b1626" />
              <path d="M36 50 Q51 56 66 50 L66 56 Q51 62 36 56Z" fill="#1b1626" />
              <path d="M51 24 Q56 20 62 26" stroke={p.trim} strokeWidth="1.5" fill="none" />
            </g>
          )}
          {job === "archer" && (
            <g>
              <path d="M34 44 Q32 24 51 24 Q70 24 68 44 Q64 31 51 31 Q38 31 34 44Z" fill="#3f8f4e" />
              <path d="M66 30 Q76 34 74 44" stroke="#3f8f4e" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path d="M40 26 l6 -6" stroke={p.trim} strokeWidth="2" />
            </g>
          )}
          {job === "defender" && (
            <g>
              <path d="M35 44 Q34 25 51 25 Q68 25 67 44 L67 52 Q51 56 35 52Z" fill="#9fb3c8" />
              <rect x="40" y="40" width="24" height="5" rx="2" fill="#0b1520" />
              <rect x="49" y="18" width="4" height="9" rx="2" fill={p.trim} />
            </g>
          )}
          {job === "sniper" && (
            <g>
              <path d="M36 36 Q36 25 51 25 Q66 25 66 36Z" fill="#3f3f26" />
              <rect x="34" y="34" width="34" height="4" rx="2" fill="#2a2a18" />
              <rect x="42" y="29" width="8" height="6" rx="3" fill="#fbbf24" stroke="#1f2328" strokeWidth="1.2" />
              <rect x="52" y="29" width="8" height="6" rx="3" fill="#fbbf24" stroke="#1f2328" strokeWidth="1.2" />
            </g>
          )}
          </g>
          {condition === "weak" && job !== "defender" && <rect x="38" y="36" width="26" height="4" rx="2" fill="#f5f5f4" transform="rotate(-12 51 38)" />}

          {/* front arm + weapon */}
          <g className={sitting ? "" : "char-arm"} style={{ filter: `url(#v${uid})${tier === 2 ? ` drop-shadow(0 0 4px ${glow})` : ""}` }}>
            <rect x="61" y="60" width="7" height="20" rx="3.5" fill={p.body} />
            <circle cx="64.5" cy="80" r="3.5" fill={SKIN} />
            {job === "wizard" && (
              <g>
                <rect x="63" y="44" width="3" height="56" rx="1.5" fill="#7c5a36" />
                <circle cx="64.5" cy="42" r="5" fill="#a78bfa" style={{ filter: "drop-shadow(0 0 6px #a78bfa)" }} />
              </g>
            )}
            {job === "warrior" && (
              <g>
                <rect x="63" y="46" width="4" height="34" rx="1" fill="#e5e7eb" />
                <rect x="59" y="78" width="12" height="3" rx="1" fill={p.trim} />
              </g>
            )}
            {job === "assassin" && (
              <g>
                <path d="M64 80 L74 70 L72 68 Z" fill="#e5e7eb" />
                <path d="M62 82 L54 92 L56 93 Z" fill="#e5e7eb" />
              </g>
            )}
            {job === "archer" && <path d="M70 52 Q82 78 70 104" stroke="#8b5a2b" strokeWidth="3" fill="none" />}
            {job === "archer" && <line x1="70" y1="52" x2="70" y2="104" stroke="#e5e7eb" strokeWidth=".8" />}
            {job === "sniper" && (
              <g>
                <rect x="56" y="74" width="40" height="4" rx="1.5" fill="#1f2328" />
                <rect x="70" y="69" width="12" height="4" rx="2" fill="#374151" />
                <circle cx="82" cy="71" r="2" fill="#fbbf24" />
              </g>
            )}
          </g>
          {job === "defender" && (
            <g>
              <path d="M56 58 h20 v18 Q76 92 66 98 Q56 92 56 76Z" fill="#1e4f74" stroke="#9fb3c8" strokeWidth="2.5" />
              <path d="M66 64 v24 M60 74 h12" stroke={p.trim} strokeWidth="2.5" />
            </g>
          )}
        </g>
      </g>

      {tier === 2 && (
        <g className="char-crown" transform={`translate(0 ${sitting ? 12 : 0})`}>
          <path d={job === "wizard" ? "M42 -8 l4 6 5 -8 5 8 4 -6 -1.5 10 h-15z" : "M42 13 l4 6 5 -8 5 8 4 -6 -1.5 10 h-15z"} fill="#fbbf24" stroke="#b45309" strokeWidth=".6" />
        </g>
      )}
      </g>
      {/* effects */}
      {condition === "onfire" && [0, 1, 2, 3, 4].map((i) => <circle key={i} className="char-particle" cx={34 + i * 8} cy={98 - (i % 2) * 20} r="2.6" fill={i % 2 ? "#fb923c" : "#fbbf24"} style={{ animationDelay: `${i * 0.3}s` }} />)}
      {condition === "strong" && [0, 1, 2].map((i) => <path key={i} className="char-particle" d={`M${30 + i * 20} ${80 - i * 10} l2 4 4 1 -4 1 -2 4 -2 -4 -4 -1 4 -1z`} fill="#2fe39a" style={{ animationDelay: `${i * 0.5}s` }} />)}
      {condition === "tilted" && [0, 1].map((i) => <circle key={i} className="char-particle" cx={42 + i * 18} cy="24" r="4" fill="#ff5470" opacity=".7" style={{ animationDelay: `${i * 0.6}s` }} />)}
      {condition === "burnout" && [0, 1, 2].map((i) => <circle key={i} className="char-particle" cx={44 + i * 7} cy="30" r="5" fill="#8593a5" opacity=".6" style={{ animationDelay: `${i * 0.5}s` }} />)}
      {(condition === "burnout" || condition === "weak") && <path d="M70 40 q2 4 0 6 q-2 -2 0 -6" fill="#7dd3fc" transform={condition === "burnout" ? "translate(0 12)" : undefined} />}
      {condition === "resting" && ["Z", "z", "z"].map((z, i) => <text key={i} className="char-zzz" x="68" y="40" fontSize={10 - i * 2} fontWeight="800" fill="#8593a5" style={{ animationDelay: `${i * 0.8}s` }}>{z}</text>)}
    </svg>
  );
}

function Face({ condition, job }: { condition: Condition; job: JobClass }) {
  const ink = "#1f1a17";
  if (job === "defender") {
    const c = condition === "tilted" ? "#ff5470" : condition === "onfire" ? "#fbbf24" : condition === "burnout" || condition === "resting" ? "#566275" : "#7dd3fc";
    return (
      <g>
        <rect x="45" y="41" width="5" height="2.5" rx="1" fill={c} style={{ filter: `drop-shadow(0 0 3px ${c})` }} />
        <rect x="55" y="41" width="5" height="2.5" rx="1" fill={c} style={{ filter: `drop-shadow(0 0 3px ${c})` }} />
      </g>
    );
  }
  const eyes = (() => {
    switch (condition) {
      case "onfire":
      case "strong":
        return <g stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round"><path d="M45 43 q2.5 -3 5 0" /><path d="M55 43 q2.5 -3 5 0" /></g>;
      case "tilted":
        return (
          <g>
            <path d="M44 38 l6 2.5 M61 38 l-6 2.5" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="47.5" cy="43" r="1.7" fill={ink} /><circle cx="57.5" cy="43" r="1.7" fill={ink} />
          </g>
        );
      case "burnout":
      case "resting":
        return <g stroke={ink} strokeWidth="1.6" strokeLinecap="round"><path d="M45 43.5 h5" /><path d="M55 43.5 h5" /></g>;
      case "weak":
        return <g><circle cx="47.5" cy="43.5" r="1.5" fill={ink} /><circle cx="57.5" cy="43.5" r="1.5" fill={ink} /><path d="M44.5 40 l5 1.2 M60.5 40 l-5 1.2" stroke={ink} strokeWidth="1.2" /></g>;
      default:
        return <g><circle cx="47.5" cy="43" r="1.8" fill={ink} /><circle cx="57.5" cy="43" r="1.8" fill={ink} /></g>;
    }
  })();
  const mouth =
    condition === "onfire" ? <path d="M48 49 q4 5 8 0 z" fill={ink} /> :
    condition === "strong" || condition === "steady" ? <path d="M48.5 49.5 q3.5 3 7 0" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" /> :
    condition === "tilted" ? <path d="M48 52 q4 -3 8 0" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" /> :
    condition === "resting" ? <circle cx="52" cy="50.5" r="1.4" fill={ink} /> :
    <path d="M48.5 51.5 q3.5 -2 7 0" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />;
  return (
    <g>
      <g className={condition === "resting" || condition === "burnout" ? "" : "char-blink"}>{eyes}</g>
      {job !== "assassin" && mouth}
      {condition === "tilted" && <><circle cx="44" cy="48" r="2.5" fill="#ff5470" opacity=".45" /><circle cx="60" cy="48" r="2.5" fill="#ff5470" opacity=".45" /></>}
    </g>
  );
}
