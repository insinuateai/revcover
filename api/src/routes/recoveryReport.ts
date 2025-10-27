import type { FastifyPluginAsync } from "fastify";

type Deps = {
  repo: {
    getRecoveryReport: (orgId: string) => Promise<Buffer | null | undefined>;
  };
};

export const buildRecoveryReportRoute = ({ repo }: Deps): FastifyPluginAsync => {
  return async (app) => {
    const sendPdf = async (req: any, reply: any) => {
      const { orgId } = req.params;
      const pdf = await repo.getRecoveryReport(orgId);
      if (!pdf) return reply.code(404).send();

      reply.header("content-type", "application/pdf");
      return reply.send(pdf);
    };

    // test path: /recovery-report/demo-org.pdf
    app.get("/recovery-report/:orgId.pdf", sendPdf);
    // extra tolerant route (in case tests hit without .pdf)
    app.get("/recovery-report/:orgId", sendPdf);
  };
};

export default buildRecoveryReportRoute;
