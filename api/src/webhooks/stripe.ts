import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) throw new Error("[webhooks] Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecret, {
  apiVersion: Stripe.LatestApiVersion,
});

const EVENT_STATUS_MAP: Record<string, "failed" | "recovered"> = {
  "invoice.payment_failed": "failed",
  "invoice.paid": "recovered",
};

export default async function stripeWebhooks(app: FastifyInstance) {
  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
    const signatureHeader = req.headers["stripe-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const rawBody = (req as any).rawBody as string | Buffer | undefined;

    if (!signature) {
      reply.code(400).send({ error: "missing_signature" });
      return;
    }
    if (!webhookSecret) {
      req.log.error("missing STRIPE_WEBHOOK_SECRET");
      reply.code(500).send({ error: "webhook_not_configured" });
      return;
    }
    if (!rawBody) {
      reply.code(400).send({ error: "missing_body" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature as string, webhookSecret);
    } catch (err) {
      req.log.error({ err }, "stripe signature verification failed");
      reply.code(400).send({ error: (err as Error).message });
      return;
    }

    const status = EVENT_STATUS_MAP[event.type];
    if (!status) {
      reply.send({ received: true });
      return;
    }

    const invoice = event.data.object as Stripe.Invoice;
    const amountCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
    const amountUsd = Number((amountCents / 100).toFixed(2));
    const customerIdentifier =
      invoice.customer_email ??
      (typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer && typeof invoice.customer === "object"
          ? invoice.customer.id
          : null);

    const payload: Record<string, unknown> = {
      stripe_event_id: event.id,
      invoice_id: invoice.id,
      status,
      amount: amountUsd,
      customer_email: customerIdentifier,
    };

    if (status === "recovered") {
      payload.recovered_usd = amountUsd;
    }

    const { error } = await supabaseAdmin.from("receipts").upsert(payload);
    if (error) {
      req.log.error({ err: error, eventId: event.id }, "failed to upsert receipt from stripe webhook");
      reply.code(500).send({ error: "database_error" });
      return;
    }

    reply.send({ received: true });
  });
}
