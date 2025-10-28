// api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { ENV } from "./lib/env.js";
import { summaryRoutes } from "./routes/summary.js";
import { receiptsRoutes } from "./routes/receipts.js";
import { pulseRoutes } from "./routes/pulse.js";

const app = Fastify({ logger: { level: ENV.LOG_LEVEL } });

await app.register(cors, { origin: true });

app.get("/health", async (_req, reply) => reply.send({ ok: true }));
app.get("/ready", async (_req, reply) => reply.send({ ready: true }));

await app.register(summaryRoutes);
await app.register(receiptsRoutes);
await app.register(pulseRoutes);

// 404 guard
app.setNotFoundHandler((_req, reply) => reply.code(404).send({ ok: false, code: "RVC-404" }));

app.listen({ port: ENV.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`API listening on :${ENV.PORT} (${ENV.NODE_ENV})`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
