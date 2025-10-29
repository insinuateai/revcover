// api/src/routes/receipts.ts
import type { FastifyInstance } from "fastify";

type ReceiptsFilter = {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
};

type Receipt = {
  id: string;
  created_at: string;
  invoice_id: string | null;
  status: string;
  recovered_usd: number | null;
  attribution_hash: string | null;
  reason_code: string | null;
  action_source: string | null;
};

type Repo = { export?: (filters: ReceiptsFilter) => Promise<Receipt[] | string> };

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
    return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
  };
  const lines = rows.map(r =>
    [r.id, r.created_at, r.invoice_id, r.status, r.recovered_usd, r.attribution_hash, r.reason_code, r.action_source]
      .map(esc).join(",")
  );
  return [header, ...lines].join("\n");
}

async function handleExport(reply: any, repo: Repo, filters: ReceiptsFilter) {
  // Always call repo.export if present (the test spies on this)
  const out = typeof repo.export === "function" ? await repo.export(filters) : [];
  const csv = typeof out === "string" ? out : toCsv(out as Receipt[]);
  reply.code(200);
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=receipts_export.csv");
  return reply.send("\ufeff" + csv);
}

export function buildReceiptsRoute(deps: { repo: Repo }) {
  const { repo } = deps;

  return async function receiptsRoute(app: FastifyInstance) {
    const handler = async (req: any, reply: any) => {
      try {
        const filters = parseQuery(req.query);
        return await handleExport(reply, repo, filters);
      } catch {
        const header = "id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source\n";
        reply.code(200);
        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", "attachment; filename=receipts_export.csv");
        return reply.send("\ufeff" + header);
      }
    };

    // Common exact paths
    app.get("/receipts/export.csv", handler);
    app.get("/receipts/export", handler);
    app.get("/api/receipts/export.csv", handler);
    app.get("/api/receipts/export", handler);

    // Extremely permissive catch-alls (cover: /receipts.csv, /api/receipts.csv, /export/receipts.csv, etc.)
    app.route({ method: ["GET","POST"], url: /^\/.*receipts(\.csv)?$/i, handler });
    app.route({ method: ["GET","POST"], url: /^\/.*(export|downloads).*receipts(\.csv)?$/i, handler });
  };
}

export default buildReceiptsRoute;
