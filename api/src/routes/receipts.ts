// api/src/routes/receipts.ts
import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabase.js";

function parseQuery(q: any) {
  const page = Math.max(1, Number(q.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(q.page_size ?? 50)));
  const status = typeof q.status === "string" ? q.status : undefined;
  const search = typeof q.search === "string" ? q.search : undefined;
  const from = typeof q.from === "string" ? q.from : undefined;
  const to = typeof q.to === "string" ? q.to : undefined;
  return { page, pageSize, status, search, from, to };
}

export async function receiptsRoutes(app: FastifyInstance) {
  app.get("/receipts", async (req, reply) => {
    const { page, pageSize, status, search, from, to } = parseQuery(req.query);
    let qb = supabaseAdmin
      .from("receipts")
      .select("id, created_at, invoice_id, status, recovered_usd, attribution_hash, reason_code, action_source", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) qb = qb.eq("status", status);
    if (search) qb = qb.ilike("invoice_id", `%${search}%`);
    if (from) qb = qb.gte("created_at", from);
    if (to) qb = qb.lte("created_at", to);

    const fromRow = (page - 1) * pageSize;
    const toRow = fromRow + pageSize - 1;
    const { data, count, error } = await qb.range(fromRow, toRow);
    if (error) return reply.code(500).send({ ok: false, code: "RVC-500-LIST", error: error.message });

    return reply.send({ rows: data ?? [], total: count ?? 0 });
  });

  // CSV mirrors filters
  app.get("/receipts/export.csv", async (req, reply) => {
    const { status, search, from, to } = parseQuery(req.query);
    let qb = supabaseAdmin
      .from("receipts")
      .select("id, created_at, invoice_id, status, recovered_usd, attribution_hash, reason_code, action_source")
      .order("created_at", { ascending: false });

    if (status) qb = qb.eq("status", status);
    if (search) qb = qb.ilike("invoice_id", `%${search}%`);
    if (from) qb = qb.gte("created_at", from);
    if (to) qb = qb.lte("created_at", to);

    const { data, error } = await qb.limit(5000);
    if (error) return reply.code(500).send("id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source\n");

    function esc(v: any) {
      const s = String(v ?? "");
      // CSV injection guard
      return (/^[=\+\-@]/.test(s) ? "'" + s : s).replaceAll('"', '""');
    }

    const header = "id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source";
    const rows = (data ?? []).map(r =>
      [r.id, r.created_at, r.invoice_id, r.status, r.recovered_usd, r.attribution_hash, r.reason_code, r.action_source]
        .map(esc)
        .map(v => `"${v}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", "attachment; filename=receipts_export.csv");
    return reply.send("\ufeff" + csv); // BOM for Excel
  });
}
