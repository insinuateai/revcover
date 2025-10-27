import type { FastifyInstance } from "fastify";
import { z } from "zod";

/** Factory for Recovery Report (PDF) */
export function buildRecoveryReportRoute(deps: {
  repo: { getRecoveryReport: (orgId: string) => Promise<Buffer | Uint8Array | string | null> };
}) {
  const params = z.object({ org: z.string().min(1) });

  return async function recoveryReport(app: FastifyInstance) {
    // The test hits: /recovery-report/demo-org.pdf
    app.get("/recovery-report/:org.pdf", async (req, reply) => {
      const parsed = params.safeParse((req as any).params);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ ok: false, error: "INVALID_PARAMS", issues: parsed.error.issues });
        return;
      }

      try {
        const pdf = await deps.repo.getRecoveryReport(parsed.data.org);
        if (!pdf) {
          reply.code(404).send({ ok: false, error: "NOT_FOUND" });
          return;
        }

        reply
          .type("application/pdf")
          .header("Content-Disposition", 'inline; filename="recovery-report.pdf"')
          .send(typeof pdf === "string" ? Buffer.from(pdf) : pdf);
      } catch {
        reply.code(500).send({ ok: false, error: "INTERNAL_ERROR" });
      }
    });
  };
}

export default buildRecoveryReportRoute;
