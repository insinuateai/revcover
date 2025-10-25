import type { FastifyInstance } from "fastify";

export default async function healthRoute(app: FastifyInstance) {
  app.get("/health", async (req, reply) => {
    return reply.ok({ ok: true, uptime_s: Math.round(process.uptime()), db_ok: true, ts: new Date().toISOString() });
  });

  app.get("/ready", async (req, reply) => {
    const ready = true; // TODO: replace with DB + Stripe checks
    return reply.status(ready ? 200 : 503).ok({ ready, db_ok: true, stripe_ok: true });
  });
}
