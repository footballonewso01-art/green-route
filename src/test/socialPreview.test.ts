import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { SocialPreviewCoordinator } from "../../cloudflare/worker";
import {
  createSocialPreviewCardHtml,
  isValidSocialPreviewProfile,
  parseSocialPreviewImagePath,
} from "../../cloudflare/socialPreview";

const profileId = "abc123def456ghi";
const version = "0123456789abcdef";
const imagePath = `/social-preview/${profileId}/${version}.png`;

const profile = {
  id: profileId,
  name: "Creator <script>alert(1)</script>",
  bio: "A safe public bio",
  slug: "creator",
  domain: "",
  avatarFile: "avatar.png",
  version,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("social preview asset contract", () => {
  it("accepts only immutable profile/version PNG paths", () => {
    expect(parseSocialPreviewImagePath(imagePath)).toEqual({ profileId, version });
    expect(parseSocialPreviewImagePath(`/social-preview/${profileId}/latest.png`)).toBeNull();
    expect(parseSocialPreviewImagePath(`/social-preview/${profileId}/${version}.jpg`)).toBeNull();
    expect(parseSocialPreviewImagePath(`/social-preview/../../${version}.png`)).toBeNull();
  });

  it("validates the private metadata response including an optional alias domain", () => {
    expect(isValidSocialPreviewProfile(profile)).toBe(true);
    expect(isValidSocialPreviewProfile({ ...profile, domain: "linktery.bio" })).toBe(true);
    expect(isValidSocialPreviewProfile({ ...profile, domain: "https://evil.test" })).toBe(false);
    expect(isValidSocialPreviewProfile({ ...profile, slug: "../admin" })).toBe(false);
  });

  it("escapes profile content in the browser-rendered card", () => {
    const html = createSocialPreviewCardHtml(
      profile,
      "https://greenroute-pb.fly.dev/api/files/public/avatar.png",
      "https://linktery.com/creator",
    );

    expect(html).toContain("Creator &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("Creator <script>alert(1)</script>");
    expect(html).toContain("linktery.com/creator");
    expect(html).toContain("width: 1200px");
    expect(html).toContain("height: 630px");
  });
});

describe("social preview generation coordinator", () => {
  const createState = () => ({
    storage: {
      transaction: vi.fn(async (callback: (transaction: {
        get: () => Promise<number | undefined>;
        put: () => Promise<void>;
      }) => Promise<unknown>) => callback({
        get: async () => 0,
        put: async () => undefined,
      })),
    },
    waitUntil: vi.fn(),
  });

  const createEnv = (overrides: Record<string, unknown> = {}) => {
    let storedBytes: ArrayBuffer | null = null;
    const bucket = {
      get: vi.fn(async () => storedBytes ? ({
        body: new Response(storedBytes).body,
        size: storedBytes.byteLength,
        httpEtag: '"stored-after-render"',
      }) : null),
      head: vi.fn(async () => storedBytes ? ({
        size: storedBytes.byteLength,
        httpEtag: '"stored-after-render"',
      }) : null),
      put: vi.fn(async (_key: string, value: ArrayBuffer) => {
        storedBytes = value.slice(0);
      }),
      list: vi.fn(async () => ({ objects: [], truncated: false })),
      delete: vi.fn(async () => undefined),
    };
    const browser = {
      quickAction: vi.fn(async () => new Response(new Uint8Array(2_000), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      })),
    };
    const namespace = {
      idFromName: vi.fn((name: string) => ({ name })),
      get: vi.fn(() => ({
        fetch: vi.fn(async () => new Response(null, { status: 204 })),
      })),
    };
    return {
      bucket,
      browser,
      env: {
        ASSETS: { fetch: vi.fn() },
        DEPLOY_ENV: "production" as const,
        ROUTING_MODE: "primary" as const,
        POCKETBASE_ORIGIN: "https://greenroute-pb.fly.dev",
        REDIRECT_ORIGIN_SECRET: "test-preview-origin-secret-at-least-32-chars",
        BROWSER: browser,
        SOCIAL_PREVIEWS: bucket,
        SOCIAL_PREVIEW_COORDINATOR: namespace,
        ...overrides,
      },
    };
  };

  it("serves a durable R2 object without starting Browser Run", async () => {
    const bytes = new Uint8Array(2_000).buffer;
    const { env, bucket, browser } = createEnv();
    bucket.get.mockResolvedValueOnce({
      body: new Response(bytes).body,
      size: bytes.byteLength,
      httpEtag: '"stored-etag"',
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Linktery-Social-Preview-Origin": "v1",
      },
    })));
    const coordinator = new SocialPreviewCoordinator(createState() as never, env as never);

    const response = await coordinator.fetch(new Request(`https://preview.internal${imagePath}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('"stored-etag"');
    expect(browser.quickAction).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("does not serve a stale R2 card after its profile version becomes invalid", async () => {
    const { env, bucket, browser } = createEnv();
    bucket.get.mockResolvedValueOnce({
      body: new Response(new Uint8Array(2_000)).body,
      size: 2_000,
      httpEtag: '"stale-etag"',
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Not found", { status: 404 })));
    const coordinator = new SocialPreviewCoordinator(createState() as never, env as never);

    const response = await coordinator.fetch(new Request(`https://preview.internal${imagePath}`));

    expect(response.status).toBe(503);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(browser.quickAction).not.toHaveBeenCalled();
  });

  it("coalesces concurrent cache misses into one browser render and one R2 write", async () => {
    const { env, bucket, browser } = createEnv();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Linktery-Social-Preview-Origin": "v1",
      },
    })));
    const coordinator = new SocialPreviewCoordinator(createState() as never, env as never);
    const request = () => new Request(`https://preview.internal${imagePath}`);

    const [first, second] = await Promise.all([
      coordinator.fetch(request()),
      coordinator.fetch(request()),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.arrayBuffer()).byteLength).toBe(2_000);
    expect((await second.arrayBuffer()).byteLength).toBe(2_000);
    expect(browser.quickAction).toHaveBeenCalledTimes(1);
    expect(bucket.put).toHaveBeenCalledTimes(1);
  });

  it("does not generate an image for HEAD cache probes", async () => {
    const { env, browser } = createEnv();
    const coordinator = new SocialPreviewCoordinator(createState() as never, env as never);
    const response = await coordinator.fetch(new Request(`https://preview.internal${imagePath}`, {
      method: "HEAD",
    }));

    expect(response.status).toBe(404);
    expect(browser.quickAction).not.toHaveBeenCalled();
  });

  it("enforces the global daily browser-render budget", async () => {
    let used = 0;
    const state = {
      storage: {
        transaction: async (callback: (transaction: {
          get: () => Promise<number>;
          put: (_key: string, value: number) => Promise<void>;
        }) => Promise<unknown>) => callback({
          get: async () => used,
          put: async (_key: string, value: number) => { used = value; },
        }),
      },
    };
    const { env } = createEnv();
    const coordinator = new SocialPreviewCoordinator(state as never, env as never);
    const claim = () => coordinator.fetch(new Request("https://preview.internal/budget/claim", {
      method: "POST",
      headers: { "X-Linktery-Preview-Limit": "1" },
    }));

    expect((await claim()).status).toBe(204);
    expect((await claim()).status).toBe(429);
  });

  it("serves a generated PNG and populates the local edge cache", async () => {
    const bytes = new Uint8Array(2_000);
    const edgeCache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
    };
    vi.stubGlobal("caches", { default: edgeCache });
    const waitUntil = vi.fn();
    const env = {
      ASSETS: { fetch: vi.fn() },
      DEPLOY_ENV: "production" as const,
      ROUTING_MODE: "primary" as const,
      POCKETBASE_ORIGIN: "https://greenroute-pb.fly.dev",
      SOCIAL_PREVIEWS: {},
      SOCIAL_PREVIEW_COORDINATOR: {
        idFromName: vi.fn(() => ({})),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          })),
        })),
      },
    };

    const response = await worker.fetch(
      new Request(`https://linktery.com${imagePath}`),
      env as never,
      { waitUntil },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBe(2_000);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(edgeCache.put).toHaveBeenCalledTimes(1);
  });

  it("redirects alias image requests to the primary host without rendering", async () => {
    const coordinatorFetch = vi.fn();
    const response = await worker.fetch(
      new Request(`https://linktery.bio${imagePath}`),
      {
        ASSETS: { fetch: vi.fn() },
        DEPLOY_ENV: "production",
        ROUTING_MODE: "alias",
        POCKETBASE_ORIGIN: "https://greenroute-pb.fly.dev",
        SOCIAL_PREVIEW_COORDINATOR: {
          idFromName: vi.fn(() => ({})),
          get: vi.fn(() => ({ fetch: coordinatorFetch })),
        },
      } as never,
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`https://linktery.com${imagePath}`);
    expect(coordinatorFetch).not.toHaveBeenCalled();
  });
});
