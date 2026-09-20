import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  it("returns 429 after the configured request count", () => {
    const middleware = rateLimit({ windowMs: 60_000, max: 1, key: () => "test-rate-limit" });
    const next = vi.fn();
    const response = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;
    const request = { path: "/test", ip: "127.0.0.1" } as any;

    middleware(request, response, next);
    middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});