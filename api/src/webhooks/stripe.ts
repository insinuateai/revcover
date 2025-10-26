import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import crypto from "node:crypto";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

type DLQRecord = {
  event_id: string;
  payload: unknown;
  reason: string;
};

function isValidWebhookSecret(secret?: string | null) {
  return typeof secret === "string" && /^whsec_[A-Za-z0-9]{16,}$/.test(secret);
}

export default async function stripeWebhook(app: FastifyInstance) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const webhookSecretValid = isValidWebhookSecret(STRIPE_WEBHOOK_SECRET);

  if (!STRIPE_SECRET_KEY || !webhookSecretValid) {
    app.log.warn("[Stripe] STRIPE_SECRET_KEY missing or STRIPE_WEBHOOK_SECRET invalid — webhook will reject events.");
  }

  const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

  async function insertRunIfNew(invoice: Stripe.Invoice) {
    const invoiceId = invoice.id;

    const { data: existing, error: selErr } = await supabaseAdmin.from("runs").select("id").eq("invoice_id", invoiceId).limit(1);

    if (selErr) throw selErr;
    if (existing && existing.length) return existing[0].id as string;

    const payload = {
      id: crypto.randomUUID(),
      org_id: "demo-org",
      customer_id: String(invoice.customer ?? ""),
      invoice_id: invoiceId,
      input: {
        trigger: "invoice.payment_failed",
        amount_due: invoice.amount_due,
        currency: invoice.currency,
      },
      status: "started",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("runs").insert(payload).select("id").single();

    if (error) throw error;
    return data?.id as string;
  }

  app.post("/api/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
    try {
      if (!stripe || !webhookSecretValid || !STRIPE_WEBHOOK_SECRET) {
        return reply.code(400).send({ ok: false, error: "stripe_not_configured" });
      }

      const sig = req.headers["stripe-signature"] as string | undefined;
      const raw = (req as any).rawBody as string | undefined;

      if (!sig || !raw) {
        return reply.code(400).send({ ok: false, error: "missing_signature_or_raw" });
      }

      const event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const runId = await insertRunIfNew(invoice);
        app.log.info({ runId, invoiceId: invoice.id }, "run created (idempotent)");
        return reply.send({ ok: true, run_id: runId });
      }

      return reply.send({ ok: true, received: event.type });
    } catch (err: any) {
      app.log.error({ err }, "Stripe webhook error");
      try {
        await supabaseAdmin.from("dlq_webhooks").insert({
          event_id: (err?.event?.id as string) ?? "unknown",
          payload: (err?.event as any) ?? null,
          reason: err?.message ?? "unknown_error",
        } as DLQRecord);
      } catch (e) {
        app.log.error({ e }, "Failed to write DLQ record");
      }
      return reply.code(400).send({ ok: false, error: "invalid_or_failed", message: err?.message });
    }
  });
}
