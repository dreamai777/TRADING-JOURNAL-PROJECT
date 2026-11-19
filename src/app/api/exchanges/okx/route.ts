// Connect, check and disconnect a read-only OKX API key.
// POST stores the key encrypted on the server (see src/server/vault.ts) after OKX confirms it is
// read-only. The secret is never sent back to the browser.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parsePermissions } from "@/core/okx";
import { getAccountConfig } from "@/server/okx-client";
import { clearConnectionCookie, connectionId, fail, sameOrigin, setConnectionCookie } from "@/server/okx-session";
import { newConnectionId, seal, vault } from "@/server/vault";

const Body = z.object({
  apiKey: z.string().trim().min(8).max(128),
  secret: z.string().trim().min(8).max(256),
  passphrase: z.string().min(1).max(128),
  label: z.string().trim().max(60).optional(),
  region: z.enum(["global", "eea", "us"]).default("global"),
});

export async function GET(req: NextRequest) {
  const id = connectionId(req);
  if (!id) return NextResponse.json({ connected: false });
  try {
    const rec = await vault.get(id);
    if (!rec) return NextResponse.json({ connected: false });
    return NextResponse.json({ connected: true, label: rec.label, perms: rec.perms, createdAt: rec.createdAt, region: rec.region ?? "global" });
  } catch (e) { return fail(e); }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please paste the API key, secret key and passphrase." }, { status: 400 });
  const { apiKey, secret, passphrase, region } = parsed.data;
  const creds = { apiKey, secret: secret.trim(), passphrase };
  try {
    const cfg = await getAccountConfig(creds, region);
    const { readOnly, perms } = parsePermissions(cfg?.perm);
    if (!readOnly) {
      return NextResponse.json({
        error: `For your safety we only accept Read-only keys, and this key also has: ${perms.filter((p) => p !== "read_only").join(", ") || "unknown"} permission. Delete it in OKX and create a new key with only "Read" ticked. Nothing was saved.`,
        code: "not-read-only",
        perms,
      }, { status: 403 });
    }
    const id = newConnectionId();
    const label = parsed.data.label || "Main account";
    await vault.set(id, { exchange: "okx", label, createdAt: new Date().toISOString(), perms, accountUid: cfg?.uid, region, sealed: seal(id, creds) });
    const old = connectionId(req);
    if (old && old !== id) await vault.delete(old).catch(() => {});
    const res = NextResponse.json({ connected: true, label, perms, region });
    setConnectionCookie(res, id);
    return res;
  } catch (e) { return fail(e); }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  const id = connectionId(req);
  try {
    if (id) await vault.delete(id);
    const res = NextResponse.json({ connected: false });
    clearConnectionCookie(res);
    return res;
  } catch (e) { return fail(e); }
}
