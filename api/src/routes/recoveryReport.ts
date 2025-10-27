import type { FastifyPluginAsync } from "fastify";

type Deps = {
  repo: { getRecoveryReport: (orgId: string) => Promise<Buffer> };
};

export const buildRecoveryReportRoute =
  ({ repo }: Deps): FastifyPluginAsync =>
  async (app) => {
    app.get<{ Params: { orgId: string } }>(
      "/recovery-report/:orgId.pdf",
      async (req, reply) => {
        const { orgId } = req.params;
        const pdf = await repo.getRecoveryReport(orgId); // must be Buffer
        reply.type("application/pdf").send(pdf);
      }
    );
  };

export default buildRecoveryReportRoute;
