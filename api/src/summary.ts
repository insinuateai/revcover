// api/src/summary.ts
import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "./lib/supabaseAdmin.js";

export default async function summaryRoute(app: FastifyInstance) {
  app.get("/api/summary", async (_req, reply) => {
    try {
      const { data: runsData, error: runsErr } = await supabaseAdmin
        .from("runs")
        .select("id", { count: "exact" });

      const { data: receiptsData, error: receiptsErr } = await supabaseAdmin
        .from("receipts")
        .select("id", { count: "exact" });

      if (runsErr || receiptsErr) {
        app.log.error({ runsErr, receiptsErr }, "Summary errors");
      }

      const runs = runsData?.length ?? 0;
      const receipts = receiptsData?.length ?? 0;

      return reply.send({ runs, receipts });
    } catch (err: any) {
      app.log.error({ err }, "Summary exception");
      return reply.send({ runs: 0, receipts: 0 });
    }
  });
}
