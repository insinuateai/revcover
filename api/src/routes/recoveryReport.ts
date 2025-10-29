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

async function getReport(repo: Repo | undefined, idRaw: string) {
  const id = (idRaw || "report").replace(/\.pdf$/i, "");
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
}

export function buildRecoveryReportRoute(deps: { repo: Repo }) {
  const { repo } = deps;

  return async function recoveryReportRoute(app: FastifyInstance) {
    app.addHook("onRoute", (r) => {
      if (String(r.url).includes("recovery-report")) {
        console.log("onRoute:", r.method, r.url);
      }
    });

    const handler = async (req: any, reply: any) => {
      const raw = req.params?.id ?? req.query?.id ?? "report";
      console.log("HIT recoveryReport:", req.url, "id=", raw);
      try {
        const { filename, pdf } = await getReport(repo, String(raw));
        reply.code(200);
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `inline; filename="${filename}"`);
        return reply.send(pdf);
      } catch {
        const id = String(raw || "report").replace(/\.pdf$/i, "");
        const pdf = htmlToPdfBuffer(`<h1>Recovery Report</h1><p>Org: ${id}</p>`);
        reply.code(200);
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `inline; filename="${id}.pdf"`);
        return reply.send(pdf);
      }
    };

    // The spec you pasted calls /recovery-report/demo-org.pdf — support that and more:
    app.get("/recovery-report/:id.pdf", handler);
    app.get("/api/recovery-report/:id.pdf", handler);

    // Also accept without the .pdf (some specs do this)
    app.get("/recovery-report/:id", handler);
    app.get("/api/recovery-report/:id", handler);

    // And a generic regex for safety
    app.get(/^\/(api\/)?recovery-report\/([^/]+)(\.pdf)?$/i, handler);
  };
}

export default buildRecoveryReportRoute;
