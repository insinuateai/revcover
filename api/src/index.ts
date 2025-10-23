import Fastify from "fastify";
const app = Fastify();

app.get("/health", async () => ({ ok: true }));

app.listen({ port: 3001 }, () => {
  console.log("✅ API running on http://localhost:3001");
});
