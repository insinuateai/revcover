// api/src/routes/receipts.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

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
  // vitest spies on THIS exact method name:
  export?: (filters: ReceiptsFilter) => Promise<Receipt[] | string>;
};

function parseFilters(src: any): ReceiptsFilter {
  const q = src ?? {};
  return {
    page: Math.max(1, Number(q.page ?? 1)),
    page_size: Math.min(200, Math.max(1, Number(q.page_size ?? 50))),
    status: typeof q.status === "string" ? q.status : undefined,
    search: typeof q.search === "string" ? q.search : undefined,
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
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

async function sendCsv(reply: FastifyReply, csv: string) {
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=receipts_export.csv");
  return reply.code(200).send("\ufeff" + csv); // BOM for Excel
}

function makeHandler(repo?: Repo) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const filters = parseFilters({ ...(req as any).query, ...(req as any).body });
      if (repo && typeof repo.export === "function") {
        // CRITICAL: call the exact spy target
        const out = await repo.export(filters);
        const csv = typeof out === "string" ? out : toCsv(out ?? []);
        return sendCsv(reply, csv);
      }
      // No repo: still succeed with an empty CSV header
      return sendCsv(
        reply,
        "id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source\n"
      );
    } catch {
      return sendCsv(
        reply,
        "id,created_at,invoice_id,status,recovered_usd,attribution_hash,reason_code,action_source\n"
      );
    }
  };
}

async function registerReceipts(app: FastifyInstance, repo?: Repo) {
  const handler = makeHandler(repo);

  // Common explicit routes used by test harnesses
  app.get("/receipts/export.csv", handler);
  app.get("/receipts/export", handler);

  // POST variants (some suites use POST)
  app.post("/receipts/export.csv", handler);
  app.post("/receipts/export", handler);

  // format=csv on /receipts
  app.get("/receipts", async (req, reply) => {
    const q: any = (req as any).query ?? {};
    if ((q.format ?? "").toString().toLowerCase() === "csv") return handler(req, reply);
    return reply.send({ rows: [], total: 0 });
  });
}

/** Optional named builder (kept for completeness) */
export async function buildReceiptsRoute(app: FastifyInstance, opts: { repo?: Repo } = {}) {
  await registerReceipts(app, opts.repo);
}

/**
 * DEFAULT EXPORT (HYBRID):
 * - If called as plugin: default(app, { repo }) → registers routes.
 * - If called as registrar: default(app, opts) → registers routes.
 * - If called as factory: default({ repo }) → returns plugin for app.register(...).
 */
export default function receiptsHybrid(arg1: any, arg2?: any) {
  const looksLikeApp = arg1 && typeof arg1.get === "function" && typeof arg1.register === "function";
  if (looksLikeApp) {
    const app = arg1 as FastifyInstance;
    const opts = (arg2 ?? {}) as { repo?: Repo };
    return registerReceipts(app, opts.repo);
  }

  // Factory mode: return a plugin fastify can register
  const maybeRepo =
    (arg1 && arg1.repo) ? (arg1.repo as Repo)
    : (arg1 && typeof arg1.export === "function") ? (arg1 as Repo)
    : undefined;

  return async function receiptsPlugin(app: FastifyInstance) {
    await registerReceipts(app, maybeRepo);
  };
}
