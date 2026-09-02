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
  it("preserves profile pagination while rejecting client host and internal-header overrides", async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{"links":[]}', {
      headers: { "Content-Type": "application/json", "X-Linktery-Public-Resolver": "v1" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await worker.fetch(new Request("https://www.brand.example/api/public/profiles/creator?page=2&domain=victim.example", {
      headers: { "X-Linktery-Public-Host": "victim.example", "X-Linktery-Custom-Domain-Root": "0" },
    }), createEnv());
    expect(response.status).toBe(200);
    expect(String(upstreamFetch.mock.calls[0][0])).toBe("https://greenroute-pb.fly.dev/api/public/profiles/creator?page=2&domain=www.brand.example");
    const headers = new Headers(upstreamFetch.mock.calls[0][1]?.headers);
    expect(headers.get("X-Linktery-Public-Host")).toBe("www.brand.example");
    expect(headers.get("X-Linktery-Custom-Domain-Root")).toBe("1");
    const invalid = await worker.fetch(new Request("https://www.brand.example/api/public/profiles/creator?page=-1"), createEnv());
    expect(invalid.status).toBe(400);
    expect(upstreamFetch).toHaveBeenCalledOnce();
  });

  it("never publishes the marketing sitemap on a customer hostname", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const sitemap = await worker.fetch(new Request("https://brand.example/sitemap.xml"), createEnv());
    const robots = await worker.fetch(new Request("https://brand.example/robots.txt"), createEnv());
    expect(sitemap.status).toBe(404);
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n");
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ["linktery.com", 200],
    ["linktery.bio", 200],
    ["www.brand.example", 503],
  ])("limits legacy profile compatibility on %s to the existing first-party hosts", async (host, status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ profile: { id: "legacy-profile" }, links: [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    })));
    const response = await worker.fetch(new Request(`https://${host}/api/public/profiles/creator`), createEnv());
    expect(response.status).toBe(status);
    expect((await response.text()).includes("legacy-profile")).toBe(status === 200);
  });
  it("resolves browser fallbacks through a fixed endpoint with trusted Geo/IP", async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(
      JSON.stringify({ destination_url: "https://example.com/us" }), {
        status: 200,
        headers: { "X-Linktery-Public-Resolver": "v1", "Server": "private-origin" },
      },
    ));
    vi.stubGlobal("fetch", upstreamFetch);
    const response = await worker.fetch(new Request("https://linktery.bio/api/public/links/campaign?domain=evil.example", {
      headers: {
        "CF-Connecting-IP": "2001:db8::10", "CF-IPCountry": "US",
        "X-Linktery-Country": "RU", "X-Linktery-Client-IP": "spoofed",
        "X-Linktery-Public-Host": "evil.example", "User-Agent": "Instagram iPhone",
      },
    }), createEnv());
    expect(response.status).toBe(200);
    expect(String(upstreamFetch.mock.calls[0]?.[0])).toBe("https://greenroute-pb.fly.dev/api/public/links/campaign");
    const headers = new Headers(upstreamFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get("X-Linktery-Country")).toBe("US");
    expect(headers.get("X-Linktery-Client-IP")).toBe("2001:db8::10");
    expect(headers.get("X-Linktery-Public-Host")).toBe("linktery.bio");
    expect(headers.get("X-Linktery-Redirect-Secret")).toBe(secret);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Server")).toBeNull();
    expect(response.headers.get("X-Linktery-Public-Resolver")).toBeNull();
    expect(await response.text()).not.toContain(secret);
  });

  it("does not proxy arbitrary database routes, mutations or unattested resolver responses", async () => {
    const upstreamFetch = vi.fn(async () => new Response("private origin error", { status: 500 }));
    vi.stubGlobal("fetch", upstreamFetch);
    expect((await worker.fetch(new Request("https://linktery.com/api/public/links/campaign", { method: "POST" }), createEnv())).status).toBe(405);
    await worker.fetch(new Request("https://linktery.com/api/collections/users/records"), createEnv());
    expect(upstreamFetch).not.toHaveBeenCalled();
    const response = await worker.fetch(new Request("https://linktery.com/api/public/links/campaign"), createEnv());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private origin error");
  });

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

  it("keeps an existing Public Profile on the SPA after an origin 404", async () => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL) => String(input).includes("/api/public/profiles/")
      ? new Response('{"profile":{"id":"existing-profile"}}', {
        headers: { "X-Linktery-Public-Resolver": "v1" },
      })
      : new Response("frontend required", {
        status: 404,
        headers: { "X-Linktery-Redirect-Origin": "v1" },
      }));
    vi.stubGlobal("fetch", upstreamFetch);
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
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });

  it.each(["GET", "HEAD"])("returns a real %s 404 only after both public resolvers confirm the slug is missing", async (method) => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => new Response("missing", {
      status: 404,
      headers: String(input).includes("/api/public/")
        ? { "X-Linktery-Public-Resolver": "v1" }
        : { "X-Linktery-Redirect-Origin": "v1" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv("<html>branded-not-found</html>");

    const response = await worker.fetch(new Request("https://linktery.com/nonexistent-seo-check?domain=other.example", { method }), env);

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.text()).toBe(method === "HEAD" ? "" : "<html>branded-not-found</html>");
    const lookupCalls = upstreamFetch.mock.calls.filter(([input]) => String(input).includes("/api/public/"));
    expect(lookupCalls.map(([input]) => String(input))).toEqual([
      "https://greenroute-pb.fly.dev/api/public/profiles/nonexistent-seo-check",
      "https://greenroute-pb.fly.dev/api/public/links/nonexistent-seo-check",
    ]);
    for (const [, init] of lookupCalls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("X-Linktery-Public-Host")).toBe("linktery.com");
      expect(headers.get("X-Linktery-Redirect-Secret")).toBe(secret);
    }
    expect(new URL((env.ASSETS.fetch.mock.calls[0] as unknown as [Request])[0].url).pathname)
      .toBe("/_linktery/not-found");
  });

  it("preserves React-only links such as interstitials and landing pages", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new Response("resolver response", {
      status: String(input).includes("/api/public/links/") ? 200 : 404,
      headers: String(input).includes("/api/public/")
        ? { "X-Linktery-Public-Resolver": "v1" }
        : { "X-Linktery-Redirect-Origin": "v1" },
    })));
    const response = await worker.fetch(new Request("https://linktery.com/interstitial"), createEnv());
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("public-spa-shell");
  });

  it.each([
    [404, false],
    [429, true],
    [503, true],
  ])("does not infer a missing slug from resolver status %i (attested: %s)", async (status, attested) => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).includes("/api/public/")
      ? new Response("not a confirmed miss", {
        status,
        headers: attested ? { "X-Linktery-Public-Resolver": "v1" } : {},
      })
      : new Response("frontend required", {
        status: 404,
        headers: { "X-Linktery-Redirect-Origin": "v1" },
      })));
    const response = await worker.fetch(new Request("https://linktery.com/unknown-state"), createEnv());
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("public-spa-shell");
  });

  it("keeps the SPA available when a read-only existence check times out", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/public/")) throw new Error("lookup timeout");
      return new Response("frontend required", {
        status: 404,
        headers: { "X-Linktery-Redirect-Origin": "v1" },
      });
    }));
    const response = await worker.fetch(new Request("https://linktery.com/unknown-state"), createEnv());
    expect(response.status).toBe(200);
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
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL) => new Response("read-only lookup", {
      status: String(input).includes("/api/public/profiles/") ? 404 : 200,
      headers: { "X-Linktery-Public-Resolver": "v1" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv();

    const response = await worker.fetch(
      new Request("https://linktery.com/campaign", { method: "HEAD" }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
    expect(upstreamFetch.mock.calls.every(([input]) => String(input).includes("/api/public/"))).toBe(true);
  });

  it("routes a custom hostname root to its exact Link target without exposing the slug", async () => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/public/custom-domain")) {
        return new Response(JSON.stringify({ type: "link", id: "abcde12345abcde", slug: "campaign" }), {
          status: 200,
          headers: { "X-Linktery-Custom-Domain-Origin": "v1" },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: "https://example.com/final", "X-Linktery-Redirect-Origin": "v1" },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await worker.fetch(new Request("https://brand.example/", {
      headers: { "CF-Connecting-IP": "2001:db8::20", "CF-IPCountry": "DE" },
    }), createEnv());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/final");
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
    expect(String(upstreamFetch.mock.calls[1]?.[0])).toBe("https://greenroute-pb.fly.dev/campaign");
    const mappingHeaders = new Headers(upstreamFetch.mock.calls[0]?.[1]?.headers);
    const resolverHeaders = new Headers(upstreamFetch.mock.calls[1]?.[1]?.headers);
    expect(mappingHeaders.get("X-Linktery-Public-Host")).toBe("brand.example");
    expect(resolverHeaders.get("X-Linktery-Custom-Domain-Root")).toBe("1");
    expect(resolverHeaders.get("X-Linktery-Public-Host")).toBe("brand.example");
  });

  it("caches only a valid positive hostname mapping for 30 seconds", async () => {
    let stored: Response | undefined;
    const edgeCache = {
      match: vi.fn(async () => stored?.clone()),
      put: vi.fn(async (_key: Request, response: Response) => { stored = response.clone(); }),
    };
    vi.stubGlobal("caches", { default: edgeCache });
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/public/custom-domain")) {
        return new Response(JSON.stringify({ type: "link", id: "abcde12345abcde", slug: "campaign" }), {
          status: 200,
          headers: { "X-Linktery-Custom-Domain-Origin": "v1" },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { Location: "https://example.com/final", "X-Linktery-Redirect-Origin": "v1" },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);
    const pending: Promise<unknown>[] = [];
    const context = { waitUntil: (promise: Promise<unknown>) => pending.push(promise) };

    await worker.fetch(new Request("https://brand.example/"), createEnv(), context);
    await Promise.all(pending);
    await worker.fetch(new Request("https://brand.example/"), createEnv(), context);

    const mappingCalls = upstreamFetch.mock.calls.filter(([input]) => String(input).endsWith("/api/public/custom-domain"));
    expect(mappingCalls).toHaveLength(1);
    expect(edgeCache.put).toHaveBeenCalledOnce();
    expect(new Headers((edgeCache.put.mock.calls[0]?.[1] as Response).headers).get("Cache-Control")).toBe("public, max-age=30");
  });

  it("keeps a custom-domain Public Profile at the hostname root", async () => {
    const upstreamFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/public/custom-domain")) {
        return new Response(JSON.stringify({ type: "profile", id: "abcde12345abcde", slug: "creator" }), {
          status: 200,
          headers: { "X-Linktery-Custom-Domain-Origin": "v1" },
        });
      }
      return new Response(JSON.stringify({ message: "Public frontend route required" }), {
        status: 404,
        headers: { "X-Linktery-Redirect-Origin": "v1" },
      });
    });
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv();

    const response = await worker.fetch(new Request("https://creator.example/"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("public-spa-shell");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(String(upstreamFetch.mock.calls[1]?.[0])).toBe("https://greenroute-pb.fly.dev/creator");
  });

  it("returns a real 404 for unknown custom hostnames and their system paths", async () => {
    const edgeCache = { match: vi.fn(async () => undefined), put: vi.fn(async () => undefined) };
    vi.stubGlobal("caches", { default: edgeCache });
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({ message: "Not found" }), {
      status: 404,
      headers: { "X-Linktery-Custom-Domain-Origin": "v1" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const env = createEnv("<html>branded-not-found</html>");

    const root = await worker.fetch(new Request("https://unknown.example/"), env);
    const dashboard = await worker.fetch(new Request("https://unknown.example/dashboard"), env);

    expect(root.status).toBe(404);
    expect(dashboard.status).toBe(404);
    expect(upstreamFetch).toHaveBeenCalledOnce();
    expect(edgeCache.put).not.toHaveBeenCalled();
  });

  it("fails closed when a custom-domain mapping is not attested", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ type: "link", id: "abcde12345abcde", slug: "stolen" }),
      { status: 200 },
    )));
    const response = await worker.fetch(new Request("https://brand.example/"), createEnv());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("stolen");
  });
});
