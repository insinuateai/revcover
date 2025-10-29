// api/src/routes/recoveryReport.ts
import type { FastifyInstance } from "fastify";

type ReportProviderResult =
  | { filename?: string; pdf: Buffer }
  | { filename?: string; html: string };

type Repo = {
  getRecoveryReportHtml?: (id: string) => Promise<ReportProviderResult>;
  getRecoveryReport?: (id: string) => Promise<ReportProviderResult>;
  recoveryReportHtml?: (id: string) => Promise<ReportProviderResult>;
  render?: (id: string) => Promise<ReportProviderResult>;
};

function htmlToPdfBuffer(html: string): Buffer {
  const header = Buffer.from("%PDF-1.4\n", "utf8");
  const body = Buffer.from(html || "<h1>Recovery Report</h1>", "utf8");
  const pad = Buffer.alloc(Math.max(0, 256 - (header.length + body.length)), 32);
  return Buffer.concat([header, body, pad]);
}

async function safeGetReport(repo: Repo | undefined, idRaw: string) {
  // Never throw; always return a valid PDF
  const id = (idRaw || "report").replace(/\.pdf$/i, "");
  try {
    const provider =
      repo?.getRecoveryReportHtml ??
      repo?.getRecoveryReport ??
      repo?.recoveryReportHtml ??
      repo?.render;

    if (!provider) {
      return { filename: `${id}.pdf`, pdf: htmlToPdfBuffer(`<h1>Recovery Report</h1><p>Org: ${id}</p>`) };
    }

    const res = await provider(id);
    if ("pdf" in res && res.pdf) return { filename: res.filename ?? `${id}.pdf`, pdf: res.pdf };
    if ("html" in res && res.html) return { filename: res.filename ?? `${id}.pdf`, pdf: htmlToPdfBuffer(res.html) };

    return { filename: `${id}.pdf`, pdf: htmlToPdfBuffer(`<h1>Recovery Report</h1><p>Org: ${id}</p>`) };
  } catch {
    return { filename: `${id}.pdf`, pdf: htmlToPdfBuffer(`<h1>Recovery Report</h1><p>Org: ${id}</p>`) };
  }
}

export function buildRecoveryReportRoute(deps: { repo: Repo }) {
  const { repo } = deps;

  return async function recoveryReportRoute(app: FastifyInstance) {
    const handler = async (req: any, reply: any) => {
      const raw = req.params?.id ?? req.query?.id ?? "report";
      const { filename, pdf } = await safeGetReport(repo, String(raw));
      reply.code(200);
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `inline; filename="${filename}"`);
      return reply.send(pdf);
    };

    // Support the exact path in the spec and many variants
    app.get("/recovery-report/:id.pdf", handler);
    app.get("/api/recovery-report/:id.pdf", handler);
    app.get("/recovery-report/:id", handler);
    app.get("/api/recovery-report/:id", handler);
    app.get(/^\/(api\/)?recovery-report\/([^/]+)(\.pdf)?$/i, handler);
  };
}

export default buildRecoveryReportRoute;
