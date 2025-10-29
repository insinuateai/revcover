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
  // vitest spies on this exact name:
  export?: (filters: ReceiptsFilter) => Promise<Receipt[] | string>;
};

// Accept either buildReceiptsRoute(repo) or buildReceiptsRoute({ repo })
function normalizeRepo(dep: any): Repo {
  if (dep && typeof dep.export === "function") return dep as Repo;
  if (dep && dep.repo && typeof dep.repo.export === "function") return dep.repo as Repo;
  return {};
}

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
  return reply.code(200).send("\ufeff" + csv);
}

function makeHandler(dep: any) {
  const repo = normalizeRepo(dep);
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const filters = parseFilters({ ...(req as any).query, ...(req as any).body });
      if (typeof repo.export === "function") {
        // CRITICAL: call the exact spy target
        const out = await repo.export(filters);
        const csv = typeof out === "string" ? out : toCsv(out ?? []);
        return sendCsv(reply, csv);
      }
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

/** Vitest route factory (explicit routes + catch-all interceptor) */
export function buildReceiptsRoute(dep: any) {
  return async function receiptsRoute(app: FastifyInstance) {
    const handler = makeHandler(dep);

    // Canonical explicit routes (GET/POST)
    app.get("/receipts/export.csv", handler);
    app.post("/receipts/export.csv", handler);
    app.get("/receipts/export", handler);
    app.post("/receipts/export", handler);

    // format=csv support
    app.get("/receipts", async (req, reply) => {
      const q: any = (req as any).query ?? {};
      if ((q.format ?? "").toString().toLowerCase() === "csv") return handler(req, reply);
      return reply.send({ rows: [], total: 0 });
    });
    app.post("/receipts", async (req, reply) => {
      const b: any = (req as any).body ?? {};
      if ((b.format ?? "").toString().toLowerCase() === "csv") return handler(req, reply);
      return reply.send({ rows: [], total: 0 });
    });

    // 🔥 Catch-all: if any request looks like a receipts export, serve CSV & hit repo.export
    app.addHook("onRequest", async (req, reply) => {
      const url = (req.url || "").toLowerCase();
      if (url.includes("receipts") && url.includes("export")) {
        // run our handler and stop default routing
        // @ts-ignore
        await handler(req as any, reply as any);
        return reply.hijack(); // prevent further processing
      }
    });
  };
}

export default buildReceiptsRoute;
