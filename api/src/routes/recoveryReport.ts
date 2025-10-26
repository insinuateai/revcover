import type { FastifyInstance } from "fastify";

type RecoveryDeps = { repo: unknown };

export function buildRecoveryReportRoute(_deps: RecoveryDeps) {
  return async function recoveryReport(app: FastifyInstance) {
    app.get("/recovery-report/:org.pdf", async (_req, reply) => {
      reply.type("application/pdf");
      reply.send(Buffer.from("%PDF-1.3\n%…stub…"));
    });
  };
}
