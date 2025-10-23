import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import crypto from 'node:crypto';

export default async function stripeWebhook(app: FastifyInstance) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    app.log.warn('Missing Stripe keys: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.');
  }
  const stripe = secretKey ? new Stripe(secretKey, { apiVersion: '2024-04-10' }) : null;

  app.post('/api/webhooks/stripe', async (req, reply) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const raw = (req as any).rawBody as string | undefined;
    if (!stripe || !sig || !raw) {
      return reply.code(400).send({ error: 'missing_stripe_setup' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, webhookSecret!);
    } catch (err: any) {
      return reply.code(400).send({ error: 'invalid_signature', message: err.message });
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const run_id = crypto.randomUUID();
      app.log.info({ invoiceId: invoice.id, customer: invoice.customer }, 'invoice.payment_failed received');
      // TODO: insert a row into Supabase.runs here via your Supabase client.
      return reply.send({ ok: true, run_id });
    }

    return reply.send({ ok: true, received: event.type });
  });
}
