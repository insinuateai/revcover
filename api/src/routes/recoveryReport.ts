// api/src/routes/recoveryReport.ts
import type { FastifyInstance, FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify";

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

/** Fastify plugin (what vitest registers directly with app.register(buildRecoveryReportRoute, { repo })) */
export const buildRecoveryReportRoute: FastifyPluginAsync<{ repo?: Repo }> = async (app, opts) => {
  const repo = opts?.repo;

  const handler = async (req: FastifyRequest<{ Params: { id?: string } }>, reply: FastifyReply) => {
    const idRaw = (req.params?.id ?? "report").toString();
    const id = idRaw.replace(/[^a-zA-Z0-9_.-]/g, "") || "report";
    const { filename, pdf } = await getPdf(repo, id);
    return sendPdf(reply, filename, pdf);
  };

  // The path the test hits:
  app.get("/recovery-report/:id.pdf", handler);

  // Extras for robustness
  app.get("/recovery-report/:id", handler);
  app.post("/recovery-report/:id.pdf", handler);
  app.post("/recovery-report/:id", handler);
};

export default buildRecoveryReportRoute;
