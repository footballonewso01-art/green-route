import { describe, expect, it, vi } from "vitest";

import { handlePublicApiRequest } from "../../cloudflare/api-worker";

const productionEnv = {
  DEPLOY_ENV: "production" as const,
  UPSTREAM_API_ORIGIN: "https://greenroute-pb.fly.dev",
};

describe("Linktery public API gateway", () => {
  it("maps branded reads to the owner-scoped PocketBase API and preserves safe headers", async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Fly-Request-Id": "internal-fly-request-id",
          "Set-Cookie": "internal=1",
          Via: "1.1 fly.io",
          "X-Request-Id": "backend-request-id",
        },
      });
    });

    const response = await handlePublicApiRequest(
      new Request("https://api.linktery.com/v1/links?page=2&per_page=10", {
        headers: {
          Authorization: "Bearer ltk_live_test",
          Cookie: "session=private",
        },
      }),
      productionEnv,
      upstreamFetch,
    );

    expect(response.status).toBe(200);
    const [upstreamInput, upstreamInit] = upstreamFetch.mock.calls[0];
    expect(new URL(String(upstreamInput)).toString()).toBe(
      "https://greenroute-pb.fly.dev/api/v1/links?page=2&per_page=10",
    );
    expect(upstreamInit?.method).toBe("GET");
    const forwardedHeaders = new Headers(upstreamInit?.headers);
    expect(forwardedHeaders.get("authorization")).toBe("Bearer ltk_live_test");
    expect(forwardedHeaders.get("cookie")).toBeNull();
    expect(forwardedHeaders.get("x-forwarded-host")).toBe("api.linktery.com");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("fly-request-id")).toBeNull();
    expect(response.headers.get("via")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("backend-request-id");
    expect(response.headers.get("x-linktery-api-version")).toBe("1");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("forwards JSON mutations and rewrites the internal Location header", async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ data: { id: "1sdk9od3pe38u7p" } }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          Location: "/api/v1/links/1sdk9od3pe38u7p",
        },
      });
    });

    const response = await handlePublicApiRequest(
      new Request("https://api.linktery.com/v1/links", {
        method: "POST",
        headers: {
          Authorization: "Bearer ltk_live_test",
          "Content-Type": "application/json",
          "Idempotency-Key": "campaign-1",
        },
        body: JSON.stringify({
          title: "Campaign",
          destination_url: "https://example.com",
        }),
      }),
      productionEnv,
      upstreamFetch,
    );

    expect(response.status).toBe(201);
    const [, upstreamInit] = upstreamFetch.mock.calls[0];
    expect(new Headers(upstreamInit?.headers).get("idempotency-key")).toBe("campaign-1");
    expect(await new Response(upstreamInit?.body).json()).toEqual({
      title: "Campaign",
      destination_url: "https://example.com",
    });
    expect(response.headers.get("location")).toBe("/v1/links/1sdk9od3pe38u7p");
  });

  it.each([
    "https://api.linktery.com/api/collections/users/records",
    "https://api.linktery.com/v1/admin",
    "https://api.linktery.com/v1/links/not-a-record-id",
    "https://greenroute-pb.fly.dev/v1/links",
  ])("does not expose internal or unknown route %s", async (url) => {
    const upstreamFetch = vi.fn();
    const response = await handlePublicApiRequest(
      new Request(url, { headers: { Authorization: "Bearer ltk_live_test" } }),
      productionEnv,
      upstreamFetch,
    );

    expect(response.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "not_found" },
    });
  });

  it("rejects unsupported methods before they reach PocketBase", async () => {
    const upstreamFetch = vi.fn();
    const response = await handlePublicApiRequest(
      new Request("https://api.linktery.com/v1/links/1sdk9od3pe38u7p", {
        method: "DELETE",
        headers: { Authorization: "Bearer ltk_live_test" },
      }),
      productionEnv,
      upstreamFetch,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, PATCH");
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and oversized write bodies at the edge", async () => {
    const upstreamFetch = vi.fn();
    const wrongType = await handlePublicApiRequest(
      new Request("https://api.linktery.com/v1/links", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "not json",
      }),
      productionEnv,
      upstreamFetch,
    );
    const tooLarge = await handlePublicApiRequest(
      new Request("https://api.linktery.com/v1/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x".repeat(70 * 1024) }),
      }),
      productionEnv,
      upstreamFetch,
    );

    expect(wrongType.status).toBe(415);
    expect(tooLarge.status).toBe(413);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("returns a generic gateway error without leaking the origin", async () => {
    const response = await handlePublicApiRequest(
      new Request("https://api.linktery.com/v1/profiles"),
      productionEnv,
      vi.fn(async () => {
        throw new Error("dial tcp greenroute-pb.fly.dev:443");
      }),
    );

    expect(response.status).toBe(502);
    const body = JSON.stringify(await response.json());
    expect(body).toContain("upstream_unavailable");
    expect(body).not.toContain("greenroute-pb.fly.dev");
  });
});
