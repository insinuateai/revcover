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

type Repo = {
  // For list route (not tested here but kept for completeness)
  listReceipts?: (filters: ReceiptsFilter) => Promise<{ rows: Receipt[]; total: number }>;
  // The test spies on THIS name:
  export?: (filters: ReceiptsFilter) => Promise<Receipt[] | string>;
};

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
    const guarded = /^[=+\-@]/.test(s) ? "'" + s : s; // CSV injection guard
    return `"${guarded.replaceAll('"', '""')}"`;
  };
  const lines = rows.map(r =>
    [r.id, r.created_at, r.invoice_id, r.status, r.recovered_usd, r.attribution_hash, r.reason_code, r.action_source]
      .map(esc).join(",")
  );
  return [header, ...lines].join("\n");
}

/** Vitest expects a route factory it can register with a fake repo. */
export function buildReceiptsRoute(deps: { repo: Repo }) {
  const { repo } = deps;

  return async function receiptsRoute(app: FastifyInstance) {
    // CSV export route (this is what your test hits)
    app.get("/receipts/export.csv", async (req, reply) => {
      try {
        const filters = parseQuery(req.query);
        if (!repo.export) {
          throw new Error("repo.export not implemented");
        }
        // This line is the one the test spies on:
        const out = await repo.export(filters);

        let csv = "";
        if (typeof out === "string") {
          csv = out; // repo returned raw CSV
        } else {
          csv = toCsv(out ?? []);
        }

        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", "attachment; filename=receipts_export.csv");
        return reply.send("\ufeff" + csv); // BOM for Excel
      } catch (err: any) {
        return reply.code(500).send("id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source\n");
      }
    });
  };
}

export default buildReceiptsRoute;
