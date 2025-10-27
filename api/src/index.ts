import Fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts";
import { buildRecoveryReportRoute } from "./routes/recoveryReport";

function mockPdf(_orgId: string): Buffer {
  return Buffer.from("%PDF-1.4\n" + "x".repeat(200) + "\n%%EOF\n");
}

export async function buildApp() {
  const app = Fastify();

  const repo = {
    export: async (_args: any) => "id,amount\n1,100\n",
    getRecoveryReport: async (orgId: string) => mockPdf(orgId),
  };

  await app.register(buildReceiptsRoute({ repo }));
  await app.register(buildRecoveryReportRoute({ repo }));

  return app;
}
