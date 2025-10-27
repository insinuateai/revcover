import type { FastifyInstance } from "fastify";
import { z } from "zod";

/**
 * Factory: returns a Fastify plugin that registers the recovery report endpoints.
 */
export function buildRecoveryReportRoute(deps: {
  repo: {
    getRecoveryReport: (orgId: string) => Promise<unknown>;
  };
}) {
  const paramsSchema = z.object({ org: z.string().min(1) });

  return async function recoveryReport(app: FastifyInstance) {
    app.get("/recovery/:org", async (req, reply) => {
      const parsed = paramsSchema.safeParse((req as any).params);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ ok: false, error: "INVALID_PARAMS", issues: parsed.error.issues });
        return;
      }

      try {
        const data = await deps.repo.getRecoveryReport(parsed.data.org);
        reply.send({ ok: true, data });
      } catch (err: any) {
        reply.code(500).send({ ok: false, error: "INTERNAL_ERROR" });
      }
    });
  };
}

export { buildRecoveryReportRoute };
export default buildRecoveryReportRoute;
