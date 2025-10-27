import Fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts";
import { buildRecoveryReportRoute } from "./routes/recoveryReport";

function makeTinyPdf(text: string): Buffer {
  const body = `%PDF-1.4\n${"x".repeat(200)}\n%%EOF\n`;
  return Buffer.from(body);
}

export async function buildApp() {
  const app = Fastify();

  const repo = {
    export: async (_args: any) => "id,amount\n1,100\n",
    getRecoveryReport: async (orgId: string) => makeTinyPdf(`Report for ${orgId}`),
  };

  await app.register(buildReceiptsRoute({ repo }));
  await app.register(buildRecoveryReportRoute({ repo }));

  return app;
}
