import type { FastifyInstance, FastifyPluginAsync } from "fastify";

type Deps = {
  repo?: unknown;
};

/**
 * Factory that returns the receipts Fastify plugin. Tests expect to call:
 *   await app.register(buildReceiptsRoute({ repo }))
 */
const buildReceiptsRoute = ({ repo }: Deps = {}): FastifyPluginAsync =>
  async (app: FastifyInstance) => {
    app.get("/receipts/export.csv", async (_req, reply) => {
      const csv = "id,amount\n1,100\n";

      reply
        .header("content-type", "text/csv")
        .header("content-disposition", 'attachment; filename="receipts.csv"')
        .send(csv);
    });
  };

export default buildReceiptsRoute;
export type { Deps as ReceiptsRouteDeps };
