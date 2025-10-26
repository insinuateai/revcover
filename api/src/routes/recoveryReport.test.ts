import { test, expect } from "vitest";
import supertest from "supertest";
import buildApp from "../index.js";

test("GET /recovery-report returns PDF", async () => {
  const app = await buildApp();
  const res = await supertest(app.server).get("/recovery-report");
  expect(res.statusCode).toBe(200);
  expect(res.headers["content-type"] || "").toContain("application/pdf");
});
