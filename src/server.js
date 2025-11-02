import Fastify from "fastify";
import rawBody from "@fastify/raw-body";
import Stripe from "stripe";
import dotenv from "dotenv";
import { supabaseAdmin } from "./supabase.js";

dotenv.config();

const app = Fastify({ logger: true });

// raw body required for Stripe signature verification
await app.register(rawBody, { field: "rawBody", global: false, runFirst: true });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// simple health check
app.get("/health", async () => ({ ok: true }));

// STRIPE WEBHOOK
app.post("/api/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
  const sig = req.headers["stripe-signature"];
  if (!sig) return reply.code(400).send({ error: "Missing stripe-signature" });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // provided by raw-body plugin
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    req.log.error({ err }, "stripe signature failed");
    return reply.code(400).send({ error: `Webhook Error: ${(err as Error).message}` });
  }

  const type = event.type;
  const data = event.data.object || {};

  // map Stripe event types to our 'receipts.status'
  const statusByType = {
    "invoice.payment_failed": "failed",
    "invoice.paid": "recovered",
    "invoice.payment_succeeded": "recovered",
  };

  if (statusByType[type]) {
    const amountCents =
      data.amount_paid ?? data.amount_due ?? data.amount ?? 0;

    const row = {
      stripe_event_id: event.id,
      customer_email: data.customer_email ?? data.customer ?? null,
      amount: (amountCents || 0) / 100,
      currency: (data.currency || "usd").toLowerCase(),
      status: statusByType[type],
      invoice_id: data.id,
    };

    const { error } = await supabaseAdmin.from("receipts").upsert(row, {
      onConflict: "stripe_event_id",
    });

    if (error) {
      req.log.error({ error }, "supabase upsert failed");
      return reply.code(500).send({ error: "DB write failed" });
    }
  }

  reply.send({ received: true });
});

// start server (Render will inject PORT)
const PORT = Number(process.env.PORT || 8080);
app.listen({ port: PORT, host: "0.0.0.0" }).catch((e) => {
  console.error(e);
  process.exit(1);
});
