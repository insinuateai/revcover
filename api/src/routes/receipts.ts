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

  return async function receipts(app: FastifyInstance) {
    // The tests typically hit /receipts/export.csv?status=... etc.
    app.get("/receipts/export.csv", async (req, reply) => {
      const parsed = query.safeParse((req as any).query);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ ok: false, error: "INVALID_QUERY", issues: parsed.error.issues });
        return;
      }

      try {
        const csv = await deps.repo.export(parsed.data);
        reply
          .type("text/csv; charset=utf-8")
          .header("Content-Disposition", 'attachment; filename="receipts.csv"')
          .send(csv ?? "");
      } catch {
        reply.code(500).send({ ok: false, error: "INTERNAL_ERROR" });
      }
    });
  };
}

export default buildReceiptsRoute;
