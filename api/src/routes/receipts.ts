import type { FastifyInstance } from "fastify";

type ReceiptsDeps = { repo: unknown };

export function buildReceiptsRoute(_deps: ReceiptsDeps) {
  return async function receipts(app: FastifyInstance) {
    app.get("/receipts/export.csv", async (_req, reply) => {
      return reply.type("text/csv").send("id,amount\\n1,100");
    });
  };
}
