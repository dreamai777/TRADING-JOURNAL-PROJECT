import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("exchange key vault", async () => {
  process.env.EXCHANGE_ENCRYPTION_KEY = "test-only-passphrase-that-is-long-enough-123";
  const { newConnectionId, seal, unseal, isConnectionId } = await import("../../server/vault");
  const creds = { apiKey: "key-123456789", secret: "secret-abcdefgh", passphrase: "pp" };

  it("round-trips and never stores the secret in plain text", () => {
    const id = newConnectionId();
    expect(isConnectionId(id)).toBe(true);
    const sealed = seal(id, creds);
    expect(JSON.stringify(sealed)).not.toContain("secret-abcdefgh");
    expect(unseal(id, sealed)).toEqual(creds);
  });

  it("refuses a record moved to another connection id, or tampered with", () => {
    const sealed = seal(newConnectionId(), creds);
    expect(() => unseal(newConnectionId(), sealed)).toThrow();
    const id = newConnectionId();
    const s2 = seal(id, creds);
    const bad = { ...s2, data: Buffer.from("x" + Buffer.from(s2.data, "base64").toString("latin1"), "latin1").toString("base64") };
    expect(() => unseal(id, bad)).toThrow();
  });
});
