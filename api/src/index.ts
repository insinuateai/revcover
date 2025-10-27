import fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts.js";
import { buildRecoveryReportRoute } from "./routes/recoveryReport.js";

const repo = {
  // stubbed so the app can boot in dev; tests will inject their own spies
  export: async (_args: any) => "id,amount\n1,100\n",
  getRecoveryReport: async (_org: string) => Buffer.from("%PDF-1.4\nHELLO\n"),
};

export async function createServer() {
  const app = fastify();

  // IMPORTANT: register the CALLED builders
  await app.register(buildReceiptsRoute({ repo }));
  await app.register(buildRecoveryReportRoute({ repo }));

  return app;
}
