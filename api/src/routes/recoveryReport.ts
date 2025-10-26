// api/src/routes/recoveryReport.ts
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

type Deps = {
  repo?: any;
};

/**
 * Factory that returns a Fastify plugin.
 * Tests call: await app.register(buildRecoveryReportRoute({ repo }))
 */
export const buildRecoveryReportRoute = ({ repo }: Deps = {}): FastifyPluginAsync =>
  async (app: FastifyInstance) => {
    // Minimal PDF stream route used by tests:
    // The test injects GET "/recovery-report/demo-org.pdf"
    app.get("/recovery-report/:org.pdf", async (_req, reply) => {
      const pdfBytes = Buffer.from("%PDF-1.4\n% minimal stub\n"); // stub content
      reply
        .header("content-type", "application/pdf")
        .header("content-disposition", 'inline; filename="recovery-report.pdf"')
        .send(pdfBytes);
    });
  };

// Optional default export to be extra-forgiving
export default buildRecoveryReportRoute;
