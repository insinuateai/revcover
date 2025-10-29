import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { buildRecoveryReportRoute } from "./recoveryReport";

describe("recovery report route", () => {
  it("streams a PDF", async () => {
    const app = Fastify();

    // ✅ Proper registration
    const route = buildRecoveryReportRoute({ repo: {} });
    await route(app);

    const response = await app.inject({
      method: "GET",
      url: "/recovery-report/demo-org.pdf",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.rawPayload.length).toBeGreaterThan(100);
  });
});
