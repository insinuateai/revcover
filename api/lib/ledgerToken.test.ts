import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { signLedgerToken, verifyLedgerToken } from "./ledgerToken.js";

const originalSecret = process.env.LEDGER_TOKEN_SECRET;

describe("ledger token", () => {
  beforeAll(() => {
    process.env.LEDGER_TOKEN_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.LEDGER_TOKEN_SECRET = originalSecret;
  });

  it("round-trips payload", () => {
    const exp = Date.now() + 60 * 60 * 1000;
    const token = signLedgerToken({ org_id: "demo-org", exp });
    expect(verifyLedgerToken(token)).toMatchObject({ org_id: "demo-org", exp });
  });

  it("rejects expired tokens", () => {
    const token = signLedgerToken({ org_id: "demo-org", exp: Date.now() - 1000 });
    expect(verifyLedgerToken(token)).toBeNull();
  });
});
