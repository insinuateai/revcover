import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

export type SummaryPayload = {
  runs: number;
  receipts: number;
  recovered_7d: number;
  last_event_at: string | null;
};

type SummaryDeps = {
  supabase: Pick<SupabaseClient, "from">;
};

type ReceiptRow = {
  amount_cents: number | null;
  created_at: string | null;
};

const defaultDeps: SummaryDeps = { supabase: supabaseAdmin };

function centsToDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function buildSummaryRoute(deps: SummaryDeps = defaultDeps) {
  const { supabase } = deps;

  return async function summaryRoute(app: FastifyInstance) {
    app.get("/summary", async (req, reply) => {
      const orgId = (req.query as Record<string, string | undefined>)?.org_id ?? process.env.ORG_TOKEN ?? "demo-org";

      try {
        const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

        const [runsRes, receiptsRes, recoveredRes, lastReceiptRes] = await Promise.all([
          supabase.from("runs").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("receipts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("receipts").select("amount_cents, created_at").eq("org_id", orgId).gte("created_at", since),
          supabase
            .from("receipts")
            .select("created_at")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        const queryResponses = [runsRes, receiptsRes, recoveredRes, lastReceiptRes];
        for (const res of queryResponses) {
          if (res.error) throw res.error;
        }

        const recoveredCents =
          (recoveredRes.data as ReceiptRow[] | null)?.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0) ?? 0;

        const summary: SummaryPayload = {
          runs: runsRes.count ?? 0,
          receipts: receiptsRes.count ?? 0,
          recovered_7d: centsToDollars(recoveredCents),
          last_event_at: (lastReceiptRes.data as ReceiptRow[] | null)?.[0]?.created_at ?? null,
        };

        return reply.send(summary);
      } catch (err: any) {
        app.log.error({ err, orgId }, "summary failed");
        return reply.code(500).send({ error: "summary_failed", message: err?.message ?? "unknown_error" });
      }
    });
  };
}

export default buildSummaryRoute();
