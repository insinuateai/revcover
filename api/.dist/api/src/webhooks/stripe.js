import Stripe from "stripe";
import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
export default async function stripeWebhook(app) {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
        app.log.warn("[Stripe] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set — webhook will reject events.");
    }
    const stripe = STRIPE_SECRET_KEY
        ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
        : null;
    // Helper: idempotent insert by invoice_id
    async function insertRunIfNew(invoice) {
        const invoiceId = invoice.id;
        const { data: existing } = await supabaseAdmin
            .from("runs")
            .select("id, invoice_id")
            .eq("invoice_id", invoiceId)
            .limit(1);
        if (existing && existing.length) {
            return existing[0].id;
        }
        const payload = {
            id: crypto.randomUUID(),
            org_id: "demo-org", // TODO: resolve from auth or metadata
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
        const { data, error } = await supabaseAdmin
            .from("runs")
            .insert(payload)
            .select("id")
            .single();
        if (error)
            throw error;
        return data?.id;
    }
    app.post("/api/webhooks/stripe", async (req, reply) => {
        try {
            if (!stripe || !STRIPE_WEBHOOK_SECRET) {
                return reply.code(400).send({ ok: false, error: "stripe_not_configured" });
            }
            const sig = req.headers["stripe-signature"];
            const raw = req.rawBody;
            if (!sig || !raw) {
                return reply.code(400).send({ ok: false, error: "missing_signature_or_raw" });
            }
            const event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
            if (event.type === "invoice.payment_failed") {
                const invoice = event.data.object;
                const runId = await insertRunIfNew(invoice);
                app.log.info({ runId, invoiceId: invoice.id }, "run created (idempotent)");
                return reply.send({ ok: true, run_id: runId });
            }
            return reply.send({ ok: true, received: event.type });
        }
        catch (err) {
            app.log.error({ err }, "Stripe webhook error");
            // Dead-letter queue for later replay
            try {
                await supabaseAdmin.from("dlq_webhooks").insert({
                    event_id: err?.event?.id ?? "unknown",
                    payload: err?.event ?? null,
                    reason: err?.message ?? "unknown_error",
                });
            }
            catch (e) {
                app.log.error({ e }, "Failed to write DLQ record");
            }
            return reply.code(400).send({ ok: false, error: "invalid_or_failed", message: err?.message });
        }
    });
}
