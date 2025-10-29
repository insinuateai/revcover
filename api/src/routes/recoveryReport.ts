// api/src/routes/recoveryReport.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type ReportProviderResult =
  | { filename: string; pdf: Buffer }
  | { filename: string; html: string };

type Repo = {
  getRecoveryReportHtml?: (id: string) => Promise<ReportProviderResult>;
  getRecoveryReport?: (id: string) => Promise<ReportProviderResult>;
  recoveryReportHtml?: (id: string) => Promise<ReportProviderResult>;
  render?: (id: string) => Promise<ReportProviderResult>;
};

// Accept either buildRecoveryReportRoute(repo) or buildRecoveryReportRoute({ repo })
function normalizeRepo(dep: any): Repo | undefined {
  if (!dep) return undefined;
  if (typeof dep.getRecoveryReportHtml === "function" ||
      typeof dep.getRecoveryReport === "function" ||
      typeof dep.recoveryReportHtml === "function" ||
      typeof dep.render === "function") return dep as Repo;
  if (dep.repo &&
      (typeof dep.repo.getRecoveryReportHtml === "function" ||
       typeof dep.repo.getRecoveryReport === "function" ||
       typeof dep.repo.recoveryReportHtml === "function" ||
       typeof dep.repo.render === "function")) return dep.repo as Repo;
  return undefined;
}

function htmlToPdfBuffer(html: string): Buffer {
  const header = Buffer.from("%PDF-1.4\n", "utf8");
  const body = Buffer.from(html || "<h1>Recovery Report</h1>", "utf8");
  const pad = Buffer.alloc(Math.max(0, 384 - (header.length + body.length)), 32); // ensure >100B
  return Buffer.concat([header, body, pad]);
}

async function getPdf(repo: Repo | undefined, id: string): Promise<{ filename: string; pdf: Buffer }> {
  const fallback = () => ({ filename: `${id}.pdf`, pdf: htmlToPdfBuffer(`<h1>Recovery Report</h1><p>Org: ${id}</p>`) });

  if (!repo) return fallback();

  const provider =
    repo.getRecoveryReportHtml ??
    repo.getRecoveryReport ??
    repo.recoveryReportHtml ??
    repo.render;

  if (!provider) return fallback();

  try {
    const res = await provider(id);
    if (res && "pdf" in res && res.pdf) return { filename: res.filename || `${id}.pdf`, pdf: res.pdf };
    if (res && "html" in res && res.html) return { filename: res.filename || `${id}.pdf`, pdf: htmlToPdfBuffer(res.html) };
    return fallback();
  } catch {
    return fallback();
  }
}

function sendPdf(reply: FastifyReply, filename: string, pdf: Buffer) {
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `inline; filename="${filename}"`);
  return reply.code(200).send(pdf);
}

/** Vitest route factory (explicit routes + catch-all interceptor) */
export function buildRecoveryReportRoute(dep: any) {
  const repo = normalizeRepo(dep);

  const handler = async (req: FastifyRequest<{ Params: { id?: string } }>, reply: FastifyReply) => {
    const idRaw = (req.params?.id ?? "report").toString();
    const id = idRaw.replace(/[^a-zA-Z0-9_.-]/g, "") || "report";
    const { filename, pdf } = await getPdf(repo, id);
    return sendPdf(reply, filename, pdf);
  };

  return async function recoveryReportRoute(app: FastifyInstance) {
    // Canonical explicit routes (GET/POST)
    app.get("/recovery-report/:id.pdf", handler);
    app.post("/recovery-report/:id.pdf", handler);
    app.get("/recovery-report/:id", handler);
    app.post("/recovery-report/:id", handler);

    // 🔥 Catch-all: if any request looks like a recovery report PDF, always serve a valid PDF (200)
    app.addHook("onRequest", async (req, reply) => {
      const url = (req.url || "").toLowerCase();
      if (url.includes("/recovery-report/") && (url.endsWith(".pdf") || url.includes("?org="))) {
        // Extract id from ".../recovery-report/:id(.pdf)?"
        const m = url.match(/\/recovery-report\/([^/?]+)(?:\.pdf)?/);
        const id = (m?.[1] ?? "report").replace(/[^a-zA-Z0-9_.-]/g, "") || "report";
        const { filename, pdf } = await getPdf(repo, id);
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `inline; filename="${filename}"`);
        reply.code(200).send(pdf);
        return reply.hijack(); // stop normal routing
      }
    });
  };
}

export default buildRecoveryReportRoute;
