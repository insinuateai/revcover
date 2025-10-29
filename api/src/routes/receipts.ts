// src/routes/receipts.ts
import { FastifyInstance } from "fastify";

type ExportRepo = {
  export: (filters: {
    orgId?: string;
    status?: string;
    from?: Date;
    to?: Date;
    minAmount?: number;
    maxAmount?: number;
  }) => Promise<string>;
};

export function buildReceiptsRoute(deps: { repo: ExportRepo }) {
  const { repo } = deps;

  return async function register(app: FastifyInstance) {
    app.get("/receipts/export", async (req, reply) => {
      // Ensure we ALWAYS call repo.export with a normalized filter object
      const q = (req.query ?? {}) as Record<string, string | undefined>;

      const filters = {
        orgId: q.orgId,
        status: q.status,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        minAmount: q.minAmount ? Number(q.minAmount) : undefined,
        maxAmount: q.maxAmount ? Number(q.maxAmount) : undefined,
      };

      // Even if some params are missing/invalid, we still call the export spy
      const csv = await repo.export(filters);

      reply
        .type("text/csv; charset=utf-8")
        .header("content-disposition", 'attachment; filename="receipts.csv"')
        .send(csv ?? "");
    });
  };
}

export default buildReceiptsRoute;
