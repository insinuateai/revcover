import type { FastifyInstance } from "fastify";
import { z } from "zod";

/** Factory for Recovery Report (PDF) */
export function buildRecoveryReportRoute(deps: {
  repo: { getRecoveryReport: (orgId: string) => Promise<Buffer | Uint8Array | string | null | undefined> };
}) {
  const params = z.object({ org: z.string().min(1) });

  return async function recoveryReport(app: FastifyInstance) {
    app.get("/recovery-report/:org.pdf", async (req, reply) => {
      const parsed = params.safeParse((req as any).params);
      if (!parsed.success) {
        reply
          .code(400)
          .send({ ok: false, error: "INVALID_PARAMS", issues: parsed.error.issues });
        return;
      }

      const pdf = await deps.repo.getRecoveryReport(parsed.data.org);
      if (!pdf) {
        reply.code(404).send({ ok: false, error: "NOT_FOUND" });
        return;
      }

      reply
        .type("application/pdf")
        .header("Content-Disposition", `inline; filename="${parsed.data.org}.pdf"`)
        .send(typeof pdf === "string" ? Buffer.from(pdf) : pdf);
    });
  };
}

export default buildRecoveryReportRoute;
