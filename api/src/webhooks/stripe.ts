import type { FastifyInstance } from "fastify";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover" as any,
});

export default async function stripeWebhooks(app: FastifyInstance) {
  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string;
    const raw = (req as any).rawBody as string | Buffer;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      reply.code(400).send({ error: (err as Error).message });
      return;
    }
    // TODO: handle event types...
    reply.send({ received: true });
  });
}
