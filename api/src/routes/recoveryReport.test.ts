import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildRecoveryReportRoute } from "./recoveryReport.js";

const summary = {
  org_id: "demo-org",
  range_start: "2024-01-01",
  range_end: "2024-01-31",
  total_runs: 12,
  total_recoveries: 3,
  total_amount_cents: 25000,
};

const recoveries = [{ invoice_id: "INV-1", amount_cents: 1000, created_at: "2024-01-10T00:00:00Z" }];

describe("recovery report route", () => {
  it("streams a PDF", async () => {
    const repo = {
      fetch: vi.fn().mockResolvedValue({ summary, recoveries }),
    };

    const app = Fastify();
    await app.register(buildRecoveryReportRoute({ repo }));

    const response = await app.inject({ method: "GET", url: "/recovery-report/demo-org.pdf" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.rawPayload.length).toBeGreaterThan(100);
  });
});
