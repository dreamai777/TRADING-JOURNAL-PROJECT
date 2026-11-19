// Server-only vault for exchange API keys.
// Keys are encrypted with AES-256-GCM before they are stored and decrypted only inside a server
// function at sync time. The browser only ever holds a random, httpOnly connection id cookie, which
// page scripts cannot read. The id is also bound into the ciphertext, so a stored record cannot be
// swapped onto another connection.
//
// Storage: Netlify Blobs on Netlify (no setup needed), a local .data/ folder in development.
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ExchangeCredentials {
  apiKey: string;
  secret: string;
  passphrase?: string;
}

export interface VaultRecord {
  exchange: "okx";
  label: string;
  createdAt: string;
  /** Permissions the exchange reported when the key was added. */
  perms: string[];
  accountUid?: string;
  /** Which OKX site the key belongs to. Keys only work on the site they were made on. */
  region?: "global" | "eea" | "us";
  /** Encrypted ExchangeCredentials. */
  sealed: { v: 1; iv: string; tag: string; data: string };
}

export class VaultConfigError extends Error {}

let cachedKey: Buffer | null = null;
function masterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.EXCHANGE_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new VaultConfigError("The server is missing EXCHANGE_ENCRYPTION_KEY (at least 32 characters). Add it in Netlify → Site configuration → Environment variables, then redeploy.");
  }
  cachedKey = scryptSync(raw, "edgeforge-exchange-vault-v1", 32);
  return cachedKey;
}

export function seal(id: string, creds: ExchangeCredentials): VaultRecord["sealed"] {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  cipher.setAAD(Buffer.from(id));
  const data = Buffer.concat([cipher.update(JSON.stringify(creds), "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function unseal(id: string, sealed: VaultRecord["sealed"]): ExchangeCredentials {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(sealed.iv, "base64"));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const out = Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]);
  return JSON.parse(out.toString("utf8"));
}

export function newConnectionId(): string {
  return randomBytes(32).toString("base64url");
}

export const isConnectionId = (v: string | undefined): v is string => !!v && /^[A-Za-z0-9_-]{43}$/.test(v);

interface Backend {
  get(id: string): Promise<VaultRecord | null>;
  set(id: string, rec: VaultRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

let backend: Promise<Backend> | null = null;
function store(): Promise<Backend> {
  backend ??= (async () => {
    try {
      const { getStore } = await import("@netlify/blobs");
      const s = getStore({ name: "exchange-keys", consistency: "strong" });
      return {
        get: async (id) => ((await s.get(id, { type: "json" })) as VaultRecord | null) ?? null,
        set: async (id, rec) => { await s.setJSON(id, rec); },
        delete: async (id) => { await s.delete(id); },
      } satisfies Backend;
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        backend = null;
        throw new VaultConfigError(`Secure key storage is unavailable on this host (${(e as Error).name}). Deploy on Netlify, or run locally with npm run dev.`);
      }
      const dir = path.join(process.cwd(), ".data", "vault");
      const file = (id: string) => path.join(dir, `${id}.json`);
      return {
        get: async (id) => { try { return JSON.parse(await readFile(file(id), "utf8")); } catch { return null; } },
        set: async (id, rec) => { await mkdir(dir, { recursive: true }); await writeFile(file(id), JSON.stringify(rec), { mode: 0o600 }); },
        delete: async (id) => { await rm(file(id), { force: true }); },
      } satisfies Backend;
    }
  })();
  return backend;
}

export const vault = {
  get: async (id: string) => (await store()).get(id),
  set: async (id: string, rec: VaultRecord) => (await store()).set(id, rec),
  delete: async (id: string) => (await store()).delete(id),
};
