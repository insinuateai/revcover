import Fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts.js";
import { buildRecoveryReportRoute } from "./routes/recoveryReport.js";

const app = Fastify({ logger: true });

/**
 * Default repo for local boot; tests will make their own Fastify instance
 * and register the route factories with their spies/mocks.
 */
const repo = {
  export: async (_args: any) => "id,amount\n1,100\n",
  getRecoveryReport: async (_org: string) => Buffer.from("%PDF-1.4\nHELLO\n"),
};

await app.register(buildReceiptsRoute({ repo }));
await app.register(buildRecoveryReportRoute({ repo }));

export default app;
