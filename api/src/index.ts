import fastify from "fastify";
import { buildReceiptsRoute } from "./routes/receipts";
import { buildRecoveryReportRoute } from "./routes/recoveryReport";

function makeTinyPdf(text: string): Buffer {
  const pdf = `%PDF-1.4
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 72 720 Td (${text}) Tj ET
endstream
endobj
3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R >>endobj
4 0 obj<< /Type /Pages /Count 1 /Kids [3 0 R] >>endobj
5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000050 00000 n 
0000000123 00000 n 
0000000195 00000 n 
0000000269 00000 n 
trailer << /Root 5 0 R /Size 6 >>
startxref
339
%%EOF`;
  return Buffer.from(pdf);
}

const repo = {
  // Dev stubs; tests will swap these with spies/mocks.
  export: async (_args: any) => "id,amount\n1,100\n",
  getRecoveryReport: async (org: string) => makeTinyPdf(`Report for ${org}`),
};

export async function createServer() {
  const app = fastify();

  // IMPORTANT: register the RESULT of calling the builders with deps
  await app.register(buildReceiptsRoute({ repo }));
  await app.register(buildRecoveryReportRoute({ repo }));

  return app;
}
