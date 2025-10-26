import type { FastifyInstance } from "fastify";
import PDFDocument from "pdfkit";

type PdfDoc = InstanceType<typeof PDFDocument>;

export default async function recoveryReport(app: FastifyInstance) {
  app.get("/recovery-report", async (_req, reply) => {
    const doc: PdfDoc = new PDFDocument({ size: "A4", margin: 40 });

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", 'inline; filename="recovery-report.pdf"');

    const stream = doc as unknown as NodeJS.ReadableStream;
    stream.on("data", (chunk: Buffer) => reply.raw.write(chunk));
    stream.on("end", () => reply.raw.end());

    doc.fontSize(18).text("Revcover – Recovery Report", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Generated at: ${new Date().toISOString()}`);

    doc.end();
    return reply;
  });
}
