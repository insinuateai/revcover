// api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import summaryRoute from "./summary.js";
import stripeWebhook from "./webhooks/stripe.js";

async function start() {
  const app = Fastify({ logger: true });

  // CORS (permissive in dev; restrict origins in prod)
  await app.register(cors, { origin: true });

  // Stripe needs the exact raw body for signature verification
  await app.register(rawBody, {
    field: "rawBody", // req.rawBody
    global: true,
    runFirst: true,
    encoding: "utf8",
  });

  app.get("/health", async () => ({ ok: true }));

  // API routes
  await app.register(summaryRoute);
  await app.register(stripeWebhook);

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
  app.log.info(`✅ API listening on http://${host}:${port}`);
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
export {};
