import Fastify from "fastify";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import crypto from "node:crypto";
import stripeWebhook from "./webhooks/stripe.js";
import summaryRoute from "./summary.js";

const app = Fastify();
await app.register(cors);

// Needed for Stripe signature verification
await app.register(rawBody, {
  field: "rawBody", // req.rawBody
  global: true,
  runFirst: true,
  encoding: "utf8",
});

app.get("/health", async () => ({ ok: true }));

// Mount our summary route (reads counts from Supabase)
await app.register(summaryRoute);

app.post("/api/runs", async (req, reply) => {
  const body = req.body as any;
  const run_id = crypto.randomUUID();
  console.log("Run started", body);
  return reply.send({ run_id, status: "started" });
});

// Read envs with safe defaults
const PORT = Number(process.env.PORT ?? 4001);
const HOST = process.env.HOST ?? "127.0.0.1";

// Mount the Stripe webhook plugin
await app.register(stripeWebhook);

app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" }, () =>
  console.log("\u2705 API live on port", process.env.PORT ?? 3001)
);
