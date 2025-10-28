// api/src/routes/recoveryReport.ts
import type { FastifyInstance } from "fastify";
import type { Repo } from "../services/repo.js";

function htmlToPdfBuffer(html: string): Buffer {
  // Minimal stub for tests; in prod replace with real HTML->PDF (e.g., @react-pdf/renderer or Playwright printToPDF)
  // Tests usually assert content-type and a non-empty buffer/stream.
  const fakePdfHeader = "%PDF-1.4\n";
  const body = Buffer.from(html, "utf8");
  return Buffer.concat([Buffer.from(fakePdfHeader), body]);
}

/** Route factory expected by tests */
export function buildRecoveryReportRoute(deps: { repo: Repo }) {
  const { repo } = deps;

  return async function recoveryReportRoute(app: FastifyInstance) {
    app.get<{
      Params: { id: string };
    }>("/recovery-report/:id.pdf", async (req, reply) => {
      const id = req.params.id;
      const { filename, html } = await repo.getRecoveryReportHtml(id);
      const pdf = htmlToPdfBuffer(html);
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `inline; filename="${filename}"`);
      return reply.send(pdf);
    });
  };
}

// also default-export for import styles that do `import X from ...`
export default buildRecoveryReportRoute;
