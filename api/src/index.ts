import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify();

// CORS
await app.register(cors);

// Health
app.get("/health", async () => ({ ok: true }));

// Read envs with safe defaults
const PORT = Number(process.env.PORT ?? 4001);
const HOST = process.env.HOST ?? "127.0.0.1";

// Start and log the real address
app
  .listen({ port: PORT, host: HOST })
  .then((address) => {
    console.log(`✅ API listening on ${address}`);
  })
  .catch((err) => {
    console.error("❌ API failed to start:", err);
    process.exit(1);
  });
