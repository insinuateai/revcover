import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildReceiptsRoute } from "./receipts.js";

const sampleRow = {
  id: "rec-1",
  org_id: "demo-org",
  run_id: "run-1",
  customer_id: "cust-1",
  invoice_id: "INV-001",
  amount_cents: 12345,
  currency: "USD",
  recovered: true,
  reason_code: "self_test",
  action_source: "pulse",
  attribution_hash: "hash",
  created_at: "2024-01-02T00:00:00Z",
};

describe("receipts export", () => {
  it("applies filters and returns CSV", async () => {
    const repo = {
      list: vi.fn(),
      export: vi.fn().mockResolvedValue([sampleRow]),
    };

    const app = Fastify();
    await app.register(buildReceiptsRoute({ repo }));

    const response = await app.inject({
      method: "GET",
      url: "/receipts/export.csv?status=recovered&search=INV&sort=recovered_usd&direction=asc&from=2024-01-01&to=2024-12-31&page=2",
    });

    expect(repo.export).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "recovered",
        search: "INV",
        sort: "recovered_usd",
        direction: "asc",
        from: expect.any(String),
        to: expect.any(String),
        page: 2,
      }),
    );
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.body).toContain("INV-001");
    expect(response.body).toContain("123.45");
  });
});
