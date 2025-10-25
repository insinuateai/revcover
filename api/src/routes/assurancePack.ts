import { promises as fs } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import JSZip from "jszip";

const DOC_FILES = ["SECURITY.md", "RUNBOOK.md", "GTM.md", "DPA_TEMPLATE.md", "FOUNDERS_README.md"];

type AssuranceFile = {
  name: string;
  path: string;
};

type AssuranceDeps = {
  files: AssuranceFile[];
  readFile: typeof fs.readFile;
};

const defaultDeps: AssuranceDeps = {
  files: DOC_FILES.map((filename) => ({
    name: filename,
    path: path.resolve(process.cwd(), "..", filename),
  })),
  readFile: fs.readFile,
};

async function buildZipBuffer(files: AssuranceFile[], readFile: typeof fs.readFile) {
  const zip = new JSZip();
  for (const file of files) {
    try {
      const contents = await readFile(file.path);
      zip.file(file.name, contents);
    } catch (err) {
      const error = new Error(`Missing assurance asset: ${file.name}`);
      (error as any).statusCode = 500;
      throw error;
    }
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export function buildAssurancePackRoute(deps: AssuranceDeps = defaultDeps) {
  const { files, readFile } = deps;

  return async function assurancePackRoute(app: FastifyInstance) {
    app.get("/assurance-pack.zip", async (req, reply) => {
      const requestId = (req as { id?: string }).id ?? "unknown_request";
      try {
        const buffer = await buildZipBuffer(files, readFile);
        return reply
          .header("content-type", "application/zip")
          .header("content-disposition", 'attachment; filename="assurance-pack.zip"')
          .send(buffer);
      } catch (err: any) {
        const status = Number(err?.statusCode) || 500;
        app.log.error({ err, request_id: requestId, route: "assurance_pack" }, "assurance pack failed");
        return reply.code(status).send({ ok: false, error: "assurance_pack_failed", message: err?.message ?? "unknown" });
      }
    });
  };
}

export default buildAssurancePackRoute();
