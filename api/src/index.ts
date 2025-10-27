import Fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts.js";
import { buildRecoveryReportRoute } from "./routes/recoveryReport.js";

const app = Fastify({ logger: true });

/**
 * Default repo for local boot. In tests, the route factories are registered
 * with their own mocked `repo`, so this is only for dev/manual runs.
 */
const repo = {
  export: async (_args: any) => "id,amount\n1,100\n",
  getRecoveryReport: async (_org: string) => Buffer.from("%PDF-1.4\nHELLO\n"),
};

// ❗ CALL the factories with deps to obtain plugins, then register the plugins.
await app.register(buildReceiptsRoute({ repo }));
await app.register(buildRecoveryReportRoute({ repo }));

export default app;
