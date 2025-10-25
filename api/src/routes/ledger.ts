import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { verifyLedgerToken, type LedgerTokenPayload } from "../../lib/ledgerToken.js";

type ReceiptRow = {
  invoice_id: string;
  run_id: string;
  amount_cents: number;
  created_at: string;
};

type LedgerSummary = {
  runs: number;
  recoveries: number;
  recovered_usd: number;
};

type LedgerRepo = {
  summary(orgId: string): Promise<LedgerSummary>;
  recoveries(orgId: string): Promise<ReceiptRow[]>;
};

type LedgerDeps = {
  repo: LedgerRepo;
  verifyToken: typeof verifyLedgerToken;
};

const defaultDeps: LedgerDeps = {
  repo: createLedgerRepo(supabaseAdmin),
  verifyToken: verifyLedgerToken,
};

function centsToUSD(value: number) {
  return Number((value / 100).toFixed(2));
}

function createLedgerRepo(client: Pick<SupabaseClient, "from">): LedgerRepo {
  return {
    async summary(orgId) {
      const [runsRes, receiptsRes] = await Promise.all([
        client.from("runs").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        client
          .from("receipts")
          .select("amount_cents", { count: "exact" })
          .eq("org_id", orgId)
          .eq("recovered", true),
      ]);

      if (runsRes.error) throw runsRes.error;
      if (receiptsRes.error || !receiptsRes.data) throw receiptsRes.error ?? new Error("receipts_failed");

      const recoveredUSD = receiptsRes.data.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

      return {
        runs: runsRes.count ?? 0,
        recoveries: receiptsRes.count ?? 0,
        recovered_usd: centsToUSD(recoveredUSD),
      };
    },
    async recoveries(orgId) {
      const { data, error } = await client
        .from("receipts")
        .select("invoice_id, run_id, amount_cents, created_at")
        .eq("org_id", orgId)
        .eq("recovered", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data) throw error ?? new Error("recoveries_failed");
      return data as ReceiptRow[];
    },
  };
}

function renderPage(payload: LedgerTokenPayload, summary: LedgerSummary, recoveries: ReceiptRow[]) {
  const expires = new Date(payload.exp).toLocaleString();
  const rows = recoveries
    .map(
      (row) => `
        <tr>
          <td>${row.invoice_id}</td>
          <td>${row.run_id}</td>
          <td>$${centsToUSD(row.amount_cents ?? 0).toFixed(2)}</td>
          <td>${new Date(row.created_at).toLocaleString()}</td>
        </tr>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Revcover Live Ledger</title>
      <style>
        body { font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }
        main { max-width: 960px; margin: 0 auto; padding: 32px 16px 64px; }
        header { margin-bottom: 32px; }
        .card { background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.6); }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
        .metric { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(148,163,184,0.2); }
        th { color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; font-size: 12px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 12px; }
      </style>
    </head>
    <body>
      <main>
        <header>
          <span class="badge">Read-only link</span>
          <h1 style="margin: 8px 0 4px;">Live Ledger</h1>
          <p style="margin: 0; color: #cbd5f5;">Org: ${payload.org_id} • Expires ${expires}</p>
        </header>
        <section class="card">
          <h2 style="margin-top: 0;">Summary</h2>
          <div class="metrics">
            <div class="metric">
              <p style="margin: 0; color: #94a3b8;">Runs</p>
              <p style="margin: 4px 0 0; font-size: 28px;">${summary.runs}</p>
            </div>
            <div class="metric">
              <p style="margin: 0; color: #94a3b8;">Recoveries</p>
              <p style="margin: 4px 0 0; font-size: 28px;">${summary.recoveries}</p>
            </div>
            <div class="metric">
              <p style="margin: 0; color: #94a3b8;">Recovered USD</p>
              <p style="margin: 4px 0 0; font-size: 28px;">$${summary.recovered_usd.toFixed(2)}</p>
            </div>
          </div>
        </section>
        <section class="card">
          <h2 style="margin-top: 0;">Latest Recoveries</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Run</th>
                <th>Recovered</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4" style="text-align:center; padding:24px; color:#94a3b8;">No recoveries yet.</td></tr>`}
            </tbody>
          </table>
        </section>
      </main>
    </body>
  </html>`;
}

function renderForbidden() {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Revcover Ledger</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { padding: 32px; border-radius: 16px; background: rgba(15,23,42,0.8); border: 1px solid rgba(148,163,184,0.3); max-width: 360px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Link expired</h1>
        <p>This ledger link is no longer valid. Please request a new Proof-of-Value share link.</p>
      </div>
    </body>
  </html>`;
}

export function buildLedgerRoute(deps: LedgerDeps = defaultDeps) {
  const { repo, verifyToken } = deps;

  return async function ledgerRoute(app: FastifyInstance) {
    app.get("/ledger/:token", async (req, reply) => {
      const token = (req.params as { token?: string })?.token;
      const verification = verifyToken(token);
      if (!verification) {
        return reply.code(403).header("content-type", "text/html").send(renderForbidden());
      }

      try {
        const [summary, recoveries] = await Promise.all([
          repo.summary(verification.org_id),
          repo.recoveries(verification.org_id),
        ]);

        const html = renderPage(verification, summary, recoveries);
        return reply.header("content-type", "text/html").send(html);
      } catch (err) {
        app.log.error({ err, org_id: verification.org_id }, "ledger render failed");
        return reply.code(500).send("Internal Server Error");
      }
    });
  };
}

export default buildLedgerRoute();
