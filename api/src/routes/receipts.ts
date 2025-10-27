import type { FastifyPluginAsync } from "fastify";

type Deps = {
  repo: {
    export: (args: {
      status?: string;
      q?: string;
      from?: string;
      to?: string;
      limit: number;
      offset: number;
    }) => Promise<string | Buffer>;
  };
};

export const buildReceiptsRoute = ({ repo }: Deps): FastifyPluginAsync => {
  return async (app) => {
    app.get("/receipts.csv", async (req, reply) => {
      // tests expect we forward filters into repo.export
      const { status, q, from, to, limit = 1000, offset = 0 } =
        (req as any).query ?? {};

      const csv = await repo.export({ status, q, from, to, limit, offset });
      reply.header("content-type", "text/csv");
      return reply.send(csv);
    });
  };
};

export default buildReceiptsRoute;
