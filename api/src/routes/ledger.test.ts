import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildLedgerRoute } from "./ledger.js";

const sampleSummary = {
  runs: 10,
  recoveries: 5,
  recovered_usd: 123.45,
};

const mockRecoveries = [
  { invoice_id: "INV-1", run_id: "RUN-1", amount_cents: 1000, created_at: "2024-01-01T00:00:00Z" },
];

describe("ledger route", () => {
  it("renders ledger page when token valid", async () => {
    const verifyToken = vi.fn().mockReturnValue({ org_id: "demo-org", exp: Date.now() + 1000 });
    const repo = {
      summary: vi.fn().mockResolvedValue(sampleSummary),
      recoveries: vi.fn().mockResolvedValue(mockRecoveries),
    };

    const app = Fastify();
    await app.register(buildLedgerRoute({ repo, verifyToken }));

    const response = await app.inject({ method: "GET", url: "/ledger/validtoken" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Live Ledger");
    expect(response.body).toContain("INV-1");
  });

  it("returns 403 when token invalid", async () => {
    const verifyToken = vi.fn().mockReturnValue(null);
    const repo = {
      summary: vi.fn(),
      recoveries: vi.fn(),
    };
    const app = Fastify();
    await app.register(buildLedgerRoute({ repo, verifyToken }));

    const response = await app.inject({ method: "GET", url: "/ledger/badtoken" });
    expect(response.statusCode).toBe(403);
    expect(response.body).toContain("Link expired");
  });
});
