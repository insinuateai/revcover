// api/src/routes/pulse.ts
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.js";

export async function pulseRoutes(app: FastifyInstance) {
  app.post("/pulse", async (_req, reply) => {
    const invoice_id = "test_" + crypto.randomBytes(6).toString("hex");
    const recovered_usd = Number((Math.random() * 50 + 5).toFixed(2));
    const run_id = "run_" + crypto.randomBytes(6).toString("hex");
    const attribution_hash = crypto.createHash("sha256").update(`${run_id}|${invoice_id}|${recovered_usd}`).digest("hex");

    // Idempotency-ish: if invoice exists, return OK (demo-safe)
    const existing = await supabaseAdmin.from("receipts").select("id").eq("invoice_id", invoice_id).maybeSingle();
    if (!existing.data) {
      await supabaseAdmin.from("runs").insert({ id: run_id, source: "pulse" });
      await supabaseAdmin.from("receipts").insert({
        run_id, invoice_id, recovered_usd, status: "recovered", attribution_hash, action_source: "pulse"
      });
    }

    return reply.send({ ok: true, invoice_id, recovered_usd, run_id, attribution_hash });
  });
}
