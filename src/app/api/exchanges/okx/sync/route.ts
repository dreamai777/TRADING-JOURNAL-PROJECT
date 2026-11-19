// Pulls closed trades from the connected OKX account. Called in a loop by the Connections page:
// each call returns one batch plus cursors for the next, so a long history never hits the
// serverless time limit. Perps, dated futures and margin come back as journal trades. Spot comes
// back as raw fills, and the browser pairs buys and sells once it has them all (src/core/okx.ts).
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { mapPositions, type OkxInstrument } from "@/core/okx";
import { fetchHistory, getInstruments, type OkxRegion, type Stream } from "@/server/okx-client";
import { connectionId, fail, sameOrigin } from "@/server/okx-session";
import { unseal, vault } from "@/server/vault";

const STREAM_FOR = { spot: "SPOT", perp: "SWAP", futures: "FUTURES", margin: "MARGIN" } as const;
const Body = z.object({
  markets: z.array(z.string()).max(10).default(["spot", "perp"]),
  cursors: z.partialRecord(z.enum(["SWAP", "FUTURES", "MARGIN", "SPOT"]), z.string().max(64)).default({}),
});

// Contract sizes change rarely; keep them for an hour per warm function.
const instCache = new Map<string, { at: number; map: Map<string, OkxInstrument> }>();
async function instruments(region: OkxRegion, types: ("SWAP" | "FUTURES")[]) {
  const map = new Map<string, OkxInstrument>();
  for (const t of types) {
    const key = `${region}:${t}`;
    let hit = instCache.get(key);
    if (!hit || Date.now() - hit.at > 3_600_000) {
      hit = { at: Date.now(), map: new Map((await getInstruments(region, t)).map((i) => [i.instId, i])) };
      instCache.set(key, hit);
    }
    for (const [k, v] of hit.map) map.set(k, v);
  }
  return map;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const id = connectionId(req);
  if (!id) return NextResponse.json({ error: "OKX is not connected on this browser. Connect it again.", code: "not-connected" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad sync request." }, { status: 400 });
  try {
    const rec = await vault.get(id);
    if (!rec) return NextResponse.json({ error: "OKX is not connected on this browser. Connect it again.", code: "not-connected" }, { status: 401 });
    const creds = unseal(id, rec.sealed);
    const region = rec.region ?? "global";
    const streams = [...new Set(parsed.data.markets.map((m) => STREAM_FOR[m as keyof typeof STREAM_FOR]).filter(Boolean))] as Stream[];
    const { positions, fills, cursors, done } = await fetchHistory(creds, region, streams, parsed.data.cursors);
    const ctTypes = (["SWAP", "FUTURES"] as const).filter((t) => positions.some((p) => p.instType === t));
    const { trades, skipped } = mapPositions(positions, ctTypes.length ? await instruments(region, [...ctTypes]) : new Map());
    // Only the fields the spot matcher needs go back to the browser.
    const spotFills = fills.map(({ instType, instId, tradeId, ordId, side, fillPx, fillSz, fee, feeCcy, ts }) => ({ instType, instId, tradeId, ordId, side, fillPx, fillSz, fee, feeCcy, ts }));
    return NextResponse.json({ trades, spotFills, skipped, cursors, done });
  } catch (e) { return fail(e); }
}
