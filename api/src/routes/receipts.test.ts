import { test, expect } from "vitest";
import supertest from "supertest";
import buildApp from "../index.js";

test("GET /receipts responds", async () => {
  const app = await buildApp();
  const res = await supertest(app.server).get("/receipts");
  expect([200, 400]).toContain(res.statusCode); // 200 with data or 400 if validation kicks in
});
