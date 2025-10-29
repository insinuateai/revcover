import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { buildReceiptsRoute } from "./receipts";

describe("receipts export", () => {
  it("applies filters and returns CSV", async () => {
    const repo = { export: vi.fn(async () => []) };
    const app = Fastify();

    // ✅ Proper registration
    const route = buildReceiptsRoute({ repo });
    await route(app);

    // Call the route exactly like the test expects
    const response = await app.inject({
      method: "GET",
      url: "/receipts/export.csv?status=recovered",
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(repo.export).toHaveBeenCalledWith(
      expect.objectContaining({ status: "recovered" })
    );
  });
});
