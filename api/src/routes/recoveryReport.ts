import type { FastifyPluginAsync } from "fastify";

type Deps = {
  repo: {
    getRecoveryReport: (orgId: string) => Promise<Buffer>;
  };
};

export const buildRecoveryReportRoute =
  ({ repo }: Deps): FastifyPluginAsync =>
  async (app) => {
    app.get<{
      Params: { orgId: string };
    }>("/recovery-report/:orgId.pdf", async (req, reply) => {
      const { orgId } = req.params;

      // If the repo throws, Fastify will 500; that’s fine for the test harness.
      const pdf = await repo.getRecoveryReport(orgId);

      reply.type("application/pdf").send(pdf);
    });
  };

export default buildRecoveryReportRoute;
