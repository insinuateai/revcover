import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";

type RecoverySummary = {
  org_id: string;
  range_start?: string;
  range_end?: string;
  total_runs: number;
  total_recoveries: number;
  total_amount_cents: number;
};

type RecoveryRow = {
  invoice_id: string;
  amount_cents: number;
  created_at: string;
};

type RecoveryReportRepo = {
  fetch(orgId: string): Promise<{ summary: RecoverySummary; recoveries: RecoveryRow[] }>;
};

type RecoveryReportDeps = {
  repo: RecoveryReportRepo;
};

const defaultDeps: RecoveryReportDeps = {
  repo: createRecoveryReportRepo(supabaseAdmin),
};

function formatCurrency(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function drawHeader(doc: PDFDocument) {
  doc
    .fontSize(18)
    .fillColor("#0f172a")
    .text("Revcover Recovery Report", { align: "left" })
    .moveDown(0.2)
    .fontSize(10)
    .fillColor("#475569")
    .text("Proof-of-Value Program", { align: "left" })
    .moveDown();
  doc
    .moveTo(doc.x, doc.y)
    .lineTo(550, doc.y)
    .strokeColor("#cbd5f5")
    .lineWidth(1)
    .stroke()
    .moveDown();
}

function drawSummary(doc: PDFDocument, summary: RecoverySummary) {
  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text(`Organization: ${summary.org_id}`)
    .text(
      `Timeframe: ${summary.range_start ?? "n/a"} → ${summary.range_end ?? "n/a"}`,
    )
    .moveDown()
    .fontSize(11)
    .fillColor("#334155")
    .text(`Total Runs: ${summary.total_runs}`)
    .text(`Recoveries: ${summary.total_recoveries}`)
    .text(`Recovered USD: ${formatCurrency(summary.total_amount_cents)}`)
    .moveDown();
}

function drawRecoveries(doc: PDFDocument, recoveries: RecoveryRow[]) {
  doc.fontSize(14).fillColor("#0f172a").text("Recent Recoveries", { underline: true }).moveDown(0.5);
  doc.fontSize(11).fillColor("#0f172a");

  if (!recoveries.length) {
    doc.text("No recoveries recorded during this period.");
    return;
  }

  recoveries.forEach((rec) => {
    doc
      .text(`Invoice ${rec.invoice_id} • ${formatCurrency(rec.amount_cents)} • ${new Date(rec.created_at).toLocaleString()}`)
      .moveDown(0.25);
  });
}

function createRecoveryReportRepo(client: Pick<SupabaseClient, "from">): RecoveryReportRepo {
  return {
    async fetch(orgId: string) {
      const [runsRes, receiptsRes, recoveriesRes] = await Promise.all([
        client.from("runs").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        client.from("receipts").select("amount_cents, created_at", { count: "exact" }).eq("org_id", orgId).eq("recovered", true),
        client
          .from("receipts")
          .select("invoice_id, amount_cents, created_at")
          .eq("org_id", orgId)
          .eq("recovered", true)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (runsRes.error) throw runsRes.error;
      if (receiptsRes.error || !receiptsRes.data) throw receiptsRes.error ?? new Error("receipt_summary_failed");
      if (recoveriesRes.error || !recoveriesRes.data) throw recoveriesRes.error ?? new Error("receipt_list_failed");

      const amounts = receiptsRes.data.map((row) => row.amount_cents ?? 0);
      const timestamps = receiptsRes.data.map((row) => row.created_at).filter(Boolean) as string[];
      const summary: RecoverySummary = {
        org_id: orgId,
        range_start: timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString().split("T")[0] : undefined,
        range_end: timestamps.length ? new Date(timestamps[0]).toISOString().split("T")[0] : undefined,
        total_runs: runsRes.count ?? 0,
        total_recoveries: receiptsRes.count ?? 0,
        total_amount_cents: amounts.reduce((sum, value) => sum + value, 0),
      };

      return {
        summary,
        recoveries: recoveriesRes.data as RecoveryRow[],
      };
    },
  };
}

function buildPdf(summary: RecoverySummary, recoveries: RecoveryRow[]) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  drawHeader(doc);
  drawSummary(doc, summary);
  drawRecoveries(doc, recoveries);
  doc.end();
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export function buildRecoveryReportRoute(deps: RecoveryReportDeps = defaultDeps) {
  const { repo } = deps;

  return async function recoveryReportRoute(app: FastifyInstance) {
    app.get("/recovery-report/:id.pdf", async (req, reply) => {
      const id = (req.params as { id?: string })?.id;
      if (!id) {
        return reply.code(400).send({ ok: false, error: "missing_report_id" });
      }

      try {
        const { summary, recoveries } = await repo.fetch(id);
        const pdf = await buildPdf(summary, recoveries);
        return reply
          .header("content-type", "application/pdf")
          .header("content-disposition", `inline; filename="recovery-report-${id}.pdf"`)
          .send(pdf);
      } catch (err: any) {
        const status = Number(err?.statusCode) || 500;
        app.log.error({ err, report_id: id }, "recovery report failed");
        return reply.code(status).send({ ok: false, error: "recovery_report_failed" });
      }
    });
  };
}

export default buildRecoveryReportRoute();
