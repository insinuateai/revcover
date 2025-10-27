import type { FastifyInstance } from "fastify";
import { z } from "zod";

/**
 * Factory: returns a Fastify plugin that registers the receipts endpoints.
 * Tests will import { buildReceiptsRoute } (named) and pass a mock repo.
 */
export function buildReceiptsRoute(deps: {
  repo: {
    listReceipts: (args: {
      status?: string;
      q?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => Promise<unknown[]>;
  };
}) {
  const listQuery = z.object({
    status: z.string().optional(),
    q: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).default(50),
    offset: z.coerce.number().min(0).default(0),
  });

  return async function receipts(app: FastifyInstance) {
    app.get("/receipts", async (req, reply) => {
      const parsed = listQuery.safeParse((req as any).query);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ ok: false, error: "INVALID_QUERY", issues: parsed.error.issues });
        return;
      }

      try {
        const data = await deps.repo.listReceipts(parsed.data);
        reply.send({ ok: true, data });
      } catch (err: any) {
        reply.code(500).send({ ok: false, error: "INTERNAL_ERROR" });
      }
    });
  };
}

// Keep both named and default exports (tests use named; default is convenient)
export { buildReceiptsRoute };
export default buildReceiptsRoute;
