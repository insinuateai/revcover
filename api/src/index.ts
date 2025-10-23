import Fastify from "fastify";
import cors from "@fastify/cors";
import crypto from "node:crypto";

const app = Fastify();
await app.register(cors);

app.get("/health", async () => ({ ok: true }));

app.post("/api/runs", async (req, reply) => {
  const body = req.body as any;
  const run_id = crypto.randomUUID();
  console.log("Run started", body);
  return reply.send({ run_id, status: "started" });
});

app.post("/api/receipts", async (req, reply) => {
  const body = req.body as any;
  const receipt_id = crypto.randomUUID();
  console.log("Receipt created", body);
  return reply.send({ receipt_id, status: "created" });
});

app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" }, () =>
  console.log("\u2705 API live on port", process.env.PORT ?? 3001)
);
