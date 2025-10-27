import fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts.js";
import { buildRecoveryReportRoute } from "./routes/recoveryReport.js";

const repo = {
  export: async (_args: any) => "id,amount\n1,100\n",
  getRecoveryReport: async (_org: string) => Buffer.from("%PDF-1.4\nHELLO\n"),
};

export async function createServer() {
  const app = fastify();

  await app.register(buildReceiptsRoute({ repo }));
  await app.register(buildRecoveryReportRoute({ repo }));

  return app;
}
