// api/src/routes/receipts.ts
import type { FastifyInstance } from "fastify";
import type { Repo, ReceiptsFilter, Receipt } from "../services/repo.js";

function parseQuery(q: any): ReceiptsFilter {
  return {
    page: Math.max(1, Number(q?.page ?? 1)),
    page_size: Math.min(200, Math.max(1, Number(q?.page_size ?? 50))),
    status: typeof q?.status === "string" ? q.status : undefined,
    search: typeof q?.search === "string" ? q.search : undefined,
    from: typeof q?.from === "string" ? q.from : undefined,
    to: typeof q?.to === "string" ? q.to : undefined,
  };
}

function toCsv(rows: Receipt[]): string {
  const header = "id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source";
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    const guarded = /^[=+\-@]/.test(s) ? "'" + s : s;
    return `"${guarded.replaceAll('"', '""')}"`;
  };
  const lines = rows.map(r =>
    [r.id, r.created_at, r.invoice_id, r.status, r.recovered_usd, r.attribution_hash, r.reason_code, r.action_source]
      .map(esc).join(",")
  );
  return [header, ...lines].join("\n");
}

/** Route factory expected by tests */
export function buildReceiptsRoute(deps: { repo: Repo }) {
  const { repo } = deps;

  return async function receiptsRoute(app: FastifyInstance) {
    app.get("/receipts", async (req, reply) => {
      const filters = parseQuery(req.query);
      const out = await repo.listReceipts(filters);
      return reply.send(out);
    });

    app.get("/receipts/export.csv", async (req, reply) => {
      const filters = parseQuery(req.query);
      const rows = await repo.listReceiptsForExport(filters);
      const csv = toCsv(rows);
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", "attachment; filename=receipts_export.csv");
      return reply.send("\ufeff" + csv);
    });
  };
}

// also default-export for import styles that do `import X from ...`
export default buildReceiptsRoute;
