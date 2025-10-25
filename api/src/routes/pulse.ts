import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

const USD_CENTS = 100;
const PULSE_REASON = "self_test";
const PULSE_SOURCE = "pulse";

type ReceiptRow = {
  id: string;
  run_id: string;
  invoice_id: string;
  amount_cents: number;
  created_at: string;
  attribution_hash: string;
};

function dollarsToCents(amount: number): number {
  return Math.round(amount * USD_CENTS);
}

function centsToDollars(amount: number): number {
  return Number((amount / USD_CENTS).toFixed(2));
}

function randomRecovery(): number {
  const min = 25;
  const max = 250;
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function pulseHash(runId: string, invoiceId: string, recoveredUsd: number, createdAt: string) {
  const payload = `${runId}|${invoiceId}|${recoveredUsd}|${createdAt}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function fetchExistingPulse(orgId: string) {
  return supabaseAdmin
    .from("receipts")
    .select("id, run_id, invoice_id, amount_cents, attribution_hash, created_at")
    .eq("org_id", orgId)
    .eq("reason_code", PULSE_REASON)
    .eq("action_source", PULSE_SOURCE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

function formatResponse(row: ReceiptRow) {
  return {
    ok: true,
    receipt_id: row.id,
    run_id: row.run_id,
    invoice_id: row.invoice_id,
    recovered_usd: centsToDollars(row.amount_cents),
    attribution_hash: row.attribution_hash,
    created_at: row.created_at,
  };
}

export default async function pulseRoute(app: FastifyInstance) {
  app.post("/pulse", async (req, reply) => {
    const orgId = process.env.ORG_TOKEN ?? "demo-org";
    const requestId = (req as { id?: string }).id ?? "unknown_request";

    try {
      const existing = await fetchExistingPulse(orgId);
      if (existing.error) throw existing.error;
      const existingRow = existing.data as ReceiptRow | null;
      if (existingRow) {
        return reply.code(200).send({ ...formatResponse(existingRow), reused: true });
      }

      const runId = crypto.randomUUID();
      const invoiceId = `pulse-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const recoveredUsd = randomRecovery();
      const amountCents = dollarsToCents(recoveredUsd);

      const runPayload = {
        id: runId,
        org_id: orgId,
        customer_id: "pulse-self",
        invoice_id: invoiceId,
        input: { trigger: "pulse" },
        status: "completed",
        created_at: createdAt,
      };

      const runResult = await supabaseAdmin.from("runs").insert(runPayload).select("id").single();
      if (runResult.error) throw runResult.error;

      const attributionHash = pulseHash(runId, invoiceId, recoveredUsd, createdAt);

      const receiptPayload = {
        run_id: runId,
        org_id: orgId,
        customer_id: "pulse-self",
        invoice_id: invoiceId,
        amount_cents: amountCents,
        currency: "USD",
        recovered: true,
        reason_code: PULSE_REASON,
        action_source: PULSE_SOURCE,
        attribution_hash: attributionHash,
        created_at: createdAt,
      };

      const receiptResult = await supabaseAdmin.from("receipts").insert(receiptPayload).select("*").single();
      if (receiptResult.error || !receiptResult.data) throw receiptResult.error;

      return reply.code(201).send(formatResponse(receiptResult.data as ReceiptRow));
    } catch (err: any) {
      app.log.error({ err, request_id: requestId, route: "pulse" }, "pulse failed");
      return reply.code(500).send({ ok: false, error: "pulse_failed", message: err?.message ?? "unknown_error" });
    }
  });
}
