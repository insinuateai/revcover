import type { FastifyInstance, FastifyPluginAsync } from "fastify";

type RecoveryReportDeps = {
  repo?: unknown;
};

const buildRecoveryReportRoute: (deps?: RecoveryReportDeps) => FastifyPluginAsync =
  ({ repo }: RecoveryReportDeps = {}) =>
    async function recoveryReportPlugin(app: FastifyInstance) {
      app.get("/recovery-report/:org.pdf", async (_req, reply) => {
        const pdfBytes = Buffer.from("%PDF-1.4\n% minimal stub\n");

        reply
          .header("content-type", "application/pdf")
          .header("content-disposition", 'inline; filename="recovery-report.pdf"')
          .send(pdfBytes);
      });
    };

export { buildRecoveryReportRoute };
export default buildRecoveryReportRoute;
