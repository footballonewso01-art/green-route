import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../cloudflare/worker";

const secret = "test-redirect-origin-secret-at-least-32-chars";

const createEnv = (assetBody = "<html>public-spa-shell</html>") => ({
  ASSETS: {
    fetch: vi.fn(async () => new Response(assetBody, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })),
  },
  DEPLOY_ENV: "production" as const,
  ROUTING_MODE: "primary" as const,
  POCKETBASE_ORIGIN: "https://greenroute-pb.fly.dev",
  REDIRECT_ORIGIN_SECRET: secret,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cloudflare public slug resolver", () => {
  it("forwards a resolved short-link response without booting the SPA", async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, {
      status: 302,
      headers: {
        Location: "https://example.com/final",
        "X-Linktery-Redirect-Origin": "v1",
      },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv();

    const response = await worker.fetch(new Request("https://linktery.com/campaign", {
      headers: {
        "CF-Connecting-IP": "2001:db8::10",
        "CF-IPCountry": "US",
        "User-Agent": "Mozilla/5.0 Instagram iPhone",
        Referer: "https://l.instagram.com/",
      },
    }), env);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/final");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("x-linktery-redirect-origin")).toBeNull();
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();

    const upstreamUrl = upstreamFetch.mock.calls[0]?.[0] as string;
    const upstreamInit = upstreamFetch.mock.calls[0]?.[1] as RequestInit;
    const upstreamHeaders = new Headers(upstreamInit.headers);
    expect(upstreamUrl).toBe("https://greenroute-pb.fly.dev/campaign");
    expect(upstreamHeaders.get("X-Linktery-Redirect-Secret")).toBe(secret);
    expect(upstreamHeaders.get("X-Linktery-Public-Host")).toBe("linktery.com");
    expect(upstreamHeaders.get("X-Linktery-Client-IP")).toBe("2001:db8::10");
    expect(upstreamHeaders.get("X-Linktery-Country")).toBe("US");
    expect(upstreamHeaders.get("User-Agent")).toContain("Instagram");
  });

  it("passes the server-rendered deeplink handoff through with edge security headers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      "<html>instagram://extbrowser/?url=encoded</html>",
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Linktery-Redirect-Origin": "v1",
        },
      },
    )));
    const env = createEnv();

    const response = await worker.fetch(
      new Request("https://linktery.com/campaign"),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("instagram://extbrowser/");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("preserves alias-domain identity and the redirect trace at the origin", async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, {
      status: 302,
      headers: {
        Location: "https://example.com/final",
        "X-Linktery-Redirect-Origin": "v1",
      },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv();

    const response = await worker.fetch(
      new Request("https://linktery.bio/campaign?lr_trace=abc&ref=profile"),
      env,
    );

    expect(response.status).toBe(302);
    expect(upstreamFetch.mock.calls[0]?.[0]).toBe(
      "https://greenroute-pb.fly.dev/campaign?lr_trace=abc&ref=profile",
    );
    const headers = new Headers(upstreamFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get("X-Linktery-Public-Host")).toBe("linktery.bio");
  });

  it("falls back to the Public Profile SPA on an origin 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", {
      status: 404,
      headers: { "X-Linktery-Redirect-Origin": "v1" },
    })));
    const env = createEnv();

    const response = await worker.fetch(
      new Request("https://linktery.com/profile-slug"),
      env,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("public-spa-shell");
    expect(body).not.toContain("__LINKTERY_SUPPRESS_CLIENT_CLICK__");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it("does not call the origin when the shared secret is unavailable", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);
    const env = { ...createEnv(), REDIRECT_ORIGIN_SECRET: "" };

    const response = await worker.fetch(
      new Request("https://linktery.com/profile-slug"),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("public-spa-shell");
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("fails back to the SPA when the backend does not attest the shared secret", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: "https://example.com/untrusted" },
    })));
    const env = createEnv();

    const response = await worker.fetch(
      new Request("https://linktery.com/campaign"),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    const body = await response.text();
    expect(body).toContain("public-spa-shell");
    expect(body).toContain("__LINKTERY_SUPPRESS_CLIENT_CLICK__");
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it("marks an ambiguous origin timeout so the SPA cannot double-write analytics", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("connection reset after origin write");
    }));
    const env = createEnv("<html><head></head><body>public-spa-shell</body></html>");

    const response = await worker.fetch(
      new Request("https://linktery.com/campaign"),
      env,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("window.__LINKTERY_SUPPRESS_CLIENT_CLICK__=true");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("keeps HEAD requests side-effect free", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv();

    const response = await worker.fetch(
      new Request("https://linktery.com/campaign", { method: "HEAD" }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
