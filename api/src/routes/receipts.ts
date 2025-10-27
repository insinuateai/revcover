import type { FastifyPluginAsync } from "fastify";

type ExportArgs = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

type Deps = {
  repo: {
    export: (args: ExportArgs) => Promise<string | Buffer>;
  };
};

export const buildReceiptsRoute = ({ repo }: Deps): FastifyPluginAsync => {
  return async (app) => {
    // cover both common shapes just in case tests use either path
    const handler = async (req: any, reply: any) => {
      const {
        status,
        q,
        from,
        to,
        limit = 1000,
        offset = 0,
      } = req.query ?? {};

      const csv = await repo.export({ status, q, from, to, limit, offset });
      reply.header("content-type", "text/csv");
      return reply.send(csv);
    };

    app.get("/receipts.csv", handler);
    app.get("/receipts/export.csv", handler);
  };
};

export default buildReceiptsRoute;
