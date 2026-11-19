import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { okxGet, OkxError } = await import("../../server/okx-client");

afterEach(() => vi.unstubAllGlobals());

describe("OKX client", () => {
  it("signs requests the way OKX documents (timestamp + GET + path, HMAC-SHA256, base64)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: "0", data: [{ uid: "1", perm: "read_only" }] })));
    vi.stubGlobal("fetch", fetchMock);
    const rows = await okxGet({ apiKey: "K", secret: "S", passphrase: "P" }, "global", "/api/v5/account/config");
    expect(rows[0]).toMatchObject({ perm: "read_only" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://www.okx.com/api/v5/account/config");
    const h = init.headers as Record<string, string>;
    expect(h["OK-ACCESS-KEY"]).toBe("K");
    expect(h["OK-ACCESS-PASSPHRASE"]).toBe("P");
    expect(h["OK-ACCESS-SIGN"]).toBe(createHmac("sha256", "S").update(`${h["OK-ACCESS-TIMESTAMP"]}GET/api/v5/account/config`).digest("base64"));
  });

  it("turns OKX error codes into plain-English messages", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "50105", msg: "Passphrase incorrect", data: [] }))));
    await expect(okxGet({ apiKey: "K", secret: "S", passphrase: "x" }, "global", "/api/v5/account/config")).rejects.toThrow(/passphrase is wrong/i);
    await expect(okxGet({ apiKey: "K", secret: "S" }, "global", "/x")).rejects.toBeInstanceOf(OkxError);
  });
});
