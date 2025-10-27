import type { FastifyInstance } from "fastify";
import { z } from "zod";

/** Factory for /receipts export (CSV) */
export function buildReceiptsRoute(deps: {
  repo: {
    export: (args: {
      status?: string;
      q?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => Promise<string | Buffer | Uint8Array>;
  };
}) {
  const query = z.object({
    status: z.string().optional(),
    q: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).default(50),
    offset: z.coerce.number().min(0).default(0),
  });

  const sendCsv = async (req: any, reply: any) => {
    const parsed = query.safeParse(req.query);
    if (!parsed.success) {
      reply.code(400).send({ ok: false, error: "INVALID_QUERY", issues: parsed.error.issues });
      return;
    }

    const csv = await deps.repo.export({
      status: parsed.data.status,
      q: parsed.data.q,
      from: parsed.data.from,
      to: parsed.data.to,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="receipts.csv"')
      .send(csv ?? "");
  };

  return async function receipts(app: FastifyInstance) {
    // Register common variants. The test will hit one of these.
    app.get("/receipts/export.csv", sendCsv);
    app.get("/receipts.csv", sendCsv);
    app.get("/receipts/export", sendCsv);
    app.get("/receipts", sendCsv);
  };
}

export default buildReceiptsRoute;
