// The 3D hero party. Each hero loads a real .glb model from /public/hero/ when it exists;
// until then the stage shows a stand-in figure with the right gear and colors.
// To swap in artist models: drop files at the paths below and set `ready: true`.

import type { JobClass } from "./types";

export interface HeroModel {
  job: JobClass;
  name: string;
  role: string;
  file: string;
  ready: boolean;
  /** Stand-in colors: cloth, trim, skin/hair accent. */
  colors: { cloth: string; trim: string; hair: string };
  weapon: "staff" | "sword" | "axe-shield" | "bow" | "daggers" | "crossbow";
  height: number; // metres
}

export const HERO_PARTY: HeroModel[] = [
  { job: "archer", name: "Sable", role: "Ranger", file: "/hero/archer.glb", ready: false, colors: { cloth: "#2f5d3a", trim: "#b7d36b", hair: "#6b3f22" }, weapon: "bow", height: 1.72 },
  { job: "wizard", name: "Lyrael", role: "Elven arcanist", file: "/hero/wizard.glb", ready: false, colors: { cloth: "#2b2f6b", trim: "#c9a24a", hair: "#b8562b" }, weapon: "staff", height: 1.66 },
  { job: "warrior", name: "Corvin", role: "Vanguard knight", file: "/hero/warrior.glb", ready: false, colors: { cloth: "#7a1f1f", trim: "#d6b56a", hair: "#2a1d16" }, weapon: "sword", height: 1.84 },
  { job: "defender", name: "Brakka", role: "Dwarven shieldwarden", file: "/hero/defender.glb", ready: false, colors: { cloth: "#30495c", trim: "#9fb3c8", hair: "#8a8f96" }, weapon: "axe-shield", height: 1.35 },
  { job: "sniper", name: "Vesk", role: "Crossbow marksman", file: "/hero/sniper.glb", ready: false, colors: { cloth: "#4a4a2c", trim: "#e0a83a", hair: "#1b1b1b" }, weapon: "crossbow", height: 1.76 },
];
