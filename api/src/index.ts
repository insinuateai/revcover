// api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ENV } from "./lib/env.js";
import { buildReceiptsRoute } from "./routes/receipts.js";
import { buildRecoveryReportRoute } from "./routes/recoveryReport.js";
import { summaryRoutes } from "./routes/summary.js";
import { supabaseAdmin } from "./lib/supabase.js";
import type { Repo, ReceiptsFilter } from "./services/repo.js";

// Simple Supabase-backed repo impl (minimal for MVP)
const supabaseRepo: Repo = {
  async listReceipts(filters: ReceiptsFilter) {
    const page = filters.page ?? 1;
    const size = filters.page_size ?? 50;
    let qb = supabaseAdmin.from("receipts")
      .select("id, created_at, invoice_id, status, recovered_usd, attribution_hash, reason_code, action_source", { count: "exact" })
      .order("created_at", { ascending: false });
    if (filters.status) qb = qb.eq("status", filters.status);
    if (filters.search) qb = qb.ilike("invoice_id", `%${filters.search}%`);
    if (filters.from) qb = qb.gte("created_at", filters.from);
    if (filters.to) qb = qb.lte("created_at", filters.to);
    const from = (page - 1) * size;
    const to = from + size - 1;
    const { data, count, error } = await qb.range(from, to);
    if (error) throw error;
    return { rows: data ?? [], total: count ?? 0 };
  },
  async listReceiptsForExport(filters: ReceiptsFilter) {
    let qb = supabaseAdmin.from("receipts")
      .select("id, created_at, invoice_id, status, recovered_usd, attribution_hash, reason_code, action_source")
      .order("created_at", { ascending: false });
    if (filters.status) qb = qb.eq("status", filters.status);
    if (filters.search) qb = qb.ilike("invoice_id", `%${filters.search}%`);
    if (filters.from) qb = qb.gte("created_at", filters.from);
    if (filters.to) qb = qb.lte("created_at", filters.to);
    const { data, error } = await qb.limit(5000);
    if (error) throw error;
    return data ?? [];
  },
  async getRecoveryReportHtml(id: string) {
    // For MVP we accept any id and render a simple proof doc
    const safe = id.replace(/[^a-zA-Z0-9_\-\.]/g, "");
    const html = `
      <html><head><meta charset="utf-8"><title>Recovery Report</title></head>
      <body>
        <h1>Recovery Report</h1>
        <p>Organization: ${safe}</p>
        <p>Generated at: ${new Date().toISOString()}</p>
      </body></html>`;
    return { filename: `${safe}.pdf`, html };
  },
};

const app = Fastify({ logger: { level: ENV.LOG_LEVEL } });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));
app.get("/ready", async () => ({ ready: true }));

app.post<{
  Body: {
    sliders: {
      recoveryIntensity: number;
      escalationSpeed: number;
      aiAdaptiveness: number;
    };
  };
}>("/ai/strategy-preview", async (req, reply) => {
  const { sliders } = req.body;
  const base = 8000;
  const multiplier = (
    sliders.recoveryIntensity * 0.4 +
    sliders.escalationSpeed * 0.2 +
    sliders.aiAdaptiveness * 0.4
  ) / 100;

  reply.send({ expected_recovery_usd: base * (1 + multiplier / 2) });
});

await app.register(summaryRoutes);
await app.register(buildReceiptsRoute({ repo: supabaseRepo }));
await app.register(buildRecoveryReportRoute({ repo: supabaseRepo }));

app.setNotFoundHandler((_req, reply) => reply.code(404).send({ ok: false, code: "RVC-404" }));

app.listen({ port: ENV.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`API listening on :${ENV.PORT} (${ENV.NODE_ENV})`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
