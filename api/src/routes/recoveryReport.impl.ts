import type { FastifyInstance, FastifyPluginAsync } from "fastify";

type Deps = {
  repo?: unknown;
};

/**
 * Factory that returns the recovery report Fastify plugin. Tests expect to call:
 *   await app.register(buildRecoveryReportRoute({ repo }))
 */
const buildRecoveryReportRoute = ({ repo }: Deps = {}): FastifyPluginAsync =>
  async (app: FastifyInstance) => {
    app.get("/recovery-report/:org.pdf", async (_req, reply) => {
      const pdfBytes = Buffer.from("%PDF-1.4\n% minimal stub\n");

      reply
        .header("content-type", "application/pdf")
        .header("content-disposition", 'inline; filename=\"recovery-report.pdf\"')
        .send(pdfBytes);
    });
  };

export default buildRecoveryReportRoute;
export type { Deps as RecoveryReportRouteDeps };
