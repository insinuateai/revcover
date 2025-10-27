import type { FastifyInstance, FastifyPluginAsync } from "fastify";

type ReceiptsDeps = {
  repo?: unknown;
};

const buildReceiptsRoute: (deps?: ReceiptsDeps) => FastifyPluginAsync =
  ({ repo }: ReceiptsDeps = {}) =>
    async function receiptsPlugin(app: FastifyInstance) {
      app.get("/receipts/export.csv", async (_req, reply) => {
        const csv = "id,amount\n1,100\n";

        reply
          .header("content-type", "text/csv")
          .header("content-disposition", 'attachment; filename="receipts.csv"')
          .send(csv);
      });
    };

export { buildReceiptsRoute };
export default buildReceiptsRoute;
