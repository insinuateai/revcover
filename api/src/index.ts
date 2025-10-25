import Fastify from "fastify";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import stripeWebhook from "./webhooks/stripe.js";
import summaryRoute from "./routes/summary.js";
import pulseRoute from "./routes/pulse.js";
import receiptsRoute from "./routes/receipts.js";
import assurancePackRoute from "./routes/assurancePack.js";
import ledgerRoute from "./routes/ledger.js";
import recoveryReportRoute from "./routes/recoveryReport.js";

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  });

  await app.register(rawBody, { field: "rawBody", runFirst: true, routes: ["/api/webhooks/stripe"] });

  app.get("/health", async () => ({ ok: true }));

  await app.register(stripeWebhook);
  await app.register(summaryRoute);
  await app.register(pulseRoute);
  await app.register(receiptsRoute);
  await app.register(assurancePackRoute);
  await app.register(ledgerRoute);
  await app.register(recoveryReportRoute);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`API listening on :${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
