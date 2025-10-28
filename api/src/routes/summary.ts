// api/src/routes/summary.ts
import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabase.js";

export async function summaryRoutes(app: FastifyInstance) {
  app.get("/summary", async (_req, reply) => {
    const [runsCount, receiptsCount, recovered7d, lastEventAt] = await Promise.all([
      supabaseAdmin.from("runs").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("receipts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("mv_recovered_7d").select("recovered_7d").maybeSingle(),
      supabaseAdmin
        .from("receipts")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const payload = {
      runs: runsCount.count ?? 0,
      receipts: receiptsCount.count ?? 0,
      recovered_7d: Number(recovered7d.data?.recovered_7d ?? 0),
      last_event_at: lastEventAt.data?.created_at ?? null,
    };

    return reply.send(payload);
  });
}
