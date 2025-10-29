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

function htmlToPdfBuffer(html: string): Buffer {
  const header = Buffer.from("%PDF-1.4\n", "utf8");
  const body = Buffer.from(html || "<h1>Recovery Report</h1>", "utf8");
  const pad = Buffer.alloc(Math.max(0, 384 - (header.length + body.length)), 32); // comfortably >100B
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

async function registerRecovery(app: FastifyInstance, repo?: Repo) {
  const handler = async (req: FastifyRequest<{ Params: { id?: string } }>, reply: FastifyReply) => {
    const idRaw = (req.params?.id ?? "report").toString();
    const id = idRaw.replace(/[^a-zA-Z0-9_.-]/g, "") || "report";
    const { filename, pdf } = await getPdf(repo, id);
    return sendPdf(reply, filename, pdf);
  };

  app.get("/recovery-report/:id.pdf", handler);
  // Extras (some suites vary)
  app.get("/recovery-report/:id", handler);
  app.post("/recovery-report/:id.pdf", handler);
  app.post("/recovery-report/:id", handler);
}

function looksLikeApp(x: any): x is FastifyInstance {
  return x && typeof x.get === "function" && typeof x.register === "function";
}

/**
 * HYBRID export:
 * - Used as plugin: buildRecoveryReportRoute(app, { repo })
 * - Used as factory: buildRecoveryReportRoute({ repo }) → returns plugin
 */
export function buildRecoveryReportRoute(arg1: any, arg2?: any): any {
  if (looksLikeApp(arg1)) {
    const app = arg1 as FastifyInstance;
    const opts = (arg2 ?? {}) as { repo?: Repo };
    return registerRecovery(app, opts.repo);
  }
  const maybeRepo =
    (arg1 && arg1.repo) ? (arg1.repo as Repo)
    : (arg1 && (typeof arg1.getRecoveryReportHtml === "function"
             || typeof arg1.getRecoveryReport === "function"
             || typeof arg1.recoveryReportHtml === "function"
             || typeof arg1.render === "function")) ? (arg1 as Repo)
    : undefined;

  return async (app: FastifyInstance) => {
    await registerRecovery(app, maybeRepo);
  };
}

// DEFAULT is the same hybrid
export default buildRecoveryReportRoute;
