import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyRawBody from "fastify-raw-body";
import logging from "./plugins/logging.js";
import stripeWebhook from "./webhooks/stripe.js";
import summaryRoute from "./routes/summary.js";
import pulseRoute from "./routes/pulse.js";
import { buildReceiptsRoute } from "./routes/receipts.js";
import assurancePackRoute from "./routes/assurancePack.js";
import ledgerRoute from "./routes/ledger.js";
import { buildRecoveryReportRoute } from "./routes/recoveryReport.js";
import healthRoute from "./routes/health.js";

const PORT = Number(process.env.PORT ?? 3001);

export default async function buildApp() {
  const app = Fastify({ logger: true });

  const repo = {
    export: async (_args: unknown) => "id,amount\n1,100\n",
    getRecoveryReport: async (_org: string) => Buffer.from("%PDF-1.4 dummy\n", "utf8"),
    listReceipts: async (_args: unknown) => [],
  };

  await app.register(cors, {
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  });

  await app.register(logging);
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
  });

  await app.register(stripeWebhook);
  await app.register(summaryRoute);
  await app.register(pulseRoute);
  await app.register(buildReceiptsRoute({ repo }));
  await app.register(assurancePackRoute);
  await app.register(ledgerRoute);
  await app.register(buildRecoveryReportRoute({ repo }));
  await app.register(healthRoute);

  return app;
}

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`API listening on :${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  // Avoid starting the server when imported for tests.
  void main();
}
