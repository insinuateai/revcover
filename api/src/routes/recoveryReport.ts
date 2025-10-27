import type { FastifyPluginAsync } from "fastify";

type Deps = {
  repo: {
    getRecoveryReport: (orgId: string) => Promise<Buffer | null | undefined>;
  };
};

export const buildRecoveryReportRoute = ({ repo }: Deps): FastifyPluginAsync => {
  return async (app) => {
    app.get("/recovery-report/:orgId.pdf", async (req, reply) => {
      const { orgId } = (req as any).params;
      const pdf = await repo.getRecoveryReport(orgId);
      if (!pdf) return reply.code(404).send();

      reply.header("content-type", "application/pdf");
      return reply.send(pdf);
    });
  };
};

export default buildRecoveryReportRoute;
