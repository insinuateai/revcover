import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildAssurancePackRoute } from "./assurancePack.js";

async function createTempDocs(names: string[]) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "assurance-"));
  await Promise.all(
    names.map((name, idx) => fs.writeFile(path.join(dir, name), `doc-${idx}`)),
  );
  return dir;
}

describe("assurance pack route", () => {
  it("returns zipped documents", async () => {
    const names = ["SECURITY.md", "RUNBOOK.md"];
    const dir = await createTempDocs(names);
    const files = names.map((name) => ({ name, path: path.join(dir, name) }));

    const app = Fastify();
    await app.register(buildAssurancePackRoute({ files, readFile: fs.readFile }));

    const response = await app.inject({ method: "GET", url: "/assurance-pack.zip" });

    expect(response.statusCode).toBe(200);
    const zip = await JSZip.loadAsync(response.rawPayload as Buffer);
    const entries = Object.keys(zip.files);
    expect(entries).toEqual(expect.arrayContaining(names));
  });

  it("handles missing documents", async () => {
    const files = [{ name: "SECURITY.md", path: "/missing/file" }];
    const app = Fastify();
    await app.register(buildAssurancePackRoute({ files, readFile: fs.readFile }));

    const response = await app.inject({ method: "GET", url: "/assurance-pack.zip" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ ok: false, error: "assurance_pack_failed" });
  });
});
