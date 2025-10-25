import type { SupabaseClient } from "@supabase/supabase-js";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { buildSummaryRoute } from "./summary.js";

type SummaryClient = Pick<SupabaseClient, "from">;

vi.mock("../../lib/supabaseAdmin.js", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

const makeCountQuery = (count: number) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ count, data: null, error: null }),
  }),
});

const makeRecoveredQuery = (amounts: Array<{ amount_cents: number; created_at: string }>) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValue({ data: amounts, error: null }),
    }),
  }),
});

const makeLastReceiptQuery = (createdAt: string | null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: createdAt ? [{ created_at: createdAt }] : [],
          error: null,
        }),
      }),
    }),
  }),
});

describe("/summary route", () => {
  it("responds with aggregated metrics", async () => {
    const from = vi
      .fn()
      .mockReturnValueOnce(makeCountQuery(7))
      .mockReturnValueOnce(makeCountQuery(3))
      .mockReturnValueOnce(
        makeRecoveredQuery([
          { amount_cents: 12500, created_at: "2024-01-01T00:00:00Z" },
          { amount_cents: 7550, created_at: "2024-01-02T00:00:00Z" },
        ]),
      )
      .mockReturnValueOnce(makeLastReceiptQuery("2024-01-02T00:00:00Z"));

    const supabase = { from } as unknown as SummaryClient;
    const app = Fastify();
    await app.register(buildSummaryRoute({ supabase }));

    const response = await app.inject({ method: "GET", url: "/summary" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      runs: 7,
      receipts: 3,
      recovered_7d: 200.5,
      last_event_at: "2024-01-02T00:00:00Z",
    });
  });
});
