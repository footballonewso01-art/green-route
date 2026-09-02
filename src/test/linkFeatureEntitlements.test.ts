import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const utilsSource = readFileSync(
  resolve(process.cwd(), "pocketbase/pb_hooks/utils.js"),
  "utf8",
);

class HookRequestError extends Error {}

type Values = Record<string, unknown>;

const createRecord = (values: Values, originalValues?: Values) => {
  const current = { ...values };
  const original = originalValues
    ? {
        get: (field: string) => originalValues[field],
      }
    : null;

  return {
    get: (field: string) => current[field],
    set: (field: string, value: unknown) => {
      current[field] = value;
    },
    original: () => original,
    values: current,
  };
};

const createUser = (plan: "creator" | "pro" | "agency", active = true) => ({
  get: (field: string) => {
    if (field === "role") return "user";
    if (field === "plan") return plan;
    if (field === "plan_status") return active ? "active" : "expired";
    if (field === "plan_expires_at") {
      return active ? "2099-01-01 00:00:00.000Z" : "2020-01-01 00:00:00.000Z";
    }
    return "";
  },
});

const loadUtils = () => {
  const module = { exports: {} as Record<string, unknown> };
  runInNewContext(utilsSource, {
    module,
    BadRequestError: HookRequestError,
    ForbiddenError: HookRequestError,
    DynamicModel: class {
      total = 0;
    },
    $security: {
      randomString: () => "A1B2C3D4E5F6",
    },
  });
  return module.exports as {
    enforceLinkCreateOwnershipAndEntitlements: (
      app: ReturnType<typeof createApp>,
      record: ReturnType<typeof createRecord>,
      actorUserId: string,
      isAdmin: boolean,
    ) => { planName: string };
    enforceLinkFeatureEntitlements: (
      app: ReturnType<typeof createApp>,
      record: ReturnType<typeof createRecord>,
      user: ReturnType<typeof createUser>,
      isAdmin: boolean,
      isCreate?: boolean,
    ) => void;
  };
};

const createApp = (user: ReturnType<typeof createUser>) => ({
  findRecordById: () => user,
  findFirstRecordByFilter: () => {
    throw new Error("not found");
  },
  db: () => ({
    newQuery: () => ({
      bind: () => ({
        one: (model: { total: number }) => {
          model.total = 0;
        },
      }),
    }),
  }),
});

describe("server-side Link feature entitlements", () => {
  it("replaces customer-controlled slugs for plans without custom slugs", () => {
    const utils = loadUtils();
    const user = createUser("creator");
    const app = createApp(user);
    const record = createRecord({
      user_id: "user00000000001",
      slug: "handcrafted-slug",
      mode: "redirect",
    });

    const result = utils.enforceLinkCreateOwnershipAndEntitlements(
      app,
      record,
      "user00000000001",
      false,
    );

    expect(result.planName).toBe("creator");
    expect(record.values.slug).toBe("a1b2c3d4e5");
  });

  it("rejects paid routing fields submitted through the Records API", () => {
    const utils = loadUtils();
    const user = createUser("creator");
    const app = createApp(user);
    const record = createRecord({
      user_id: "user00000000001",
      slug: "generated1",
      mode: "redirect",
      geo_targeting: { US: "https://example.com/us" },
    });

    expect(() =>
      utils.enforceLinkCreateOwnershipAndEntitlements(
        app,
        record,
        "user00000000001",
        false,
      ),
    ).toThrow("Geo Targeting requires the Creator Pro plan.");
  });

  it("allows Creator Pro routing but keeps Agency features server-locked", () => {
    const utils = loadUtils();
    const user = createUser("pro");
    const app = createApp(user);
    const proRecord = createRecord({
      user_id: "user00000000001",
      slug: "generated1",
      mode: "direct",
      cloaking: true,
      safe_page_url: "https://example.com/safe",
      geo_targeting: { US: "https://example.com/us" },
    });

    expect(() =>
      utils.enforceLinkCreateOwnershipAndEntitlements(
        app,
        proRecord,
        "user00000000001",
        false,
      ),
    ).not.toThrow();

    const pixelRecord = createRecord({
      user_id: "user00000000001",
      slug: "generated2",
      mode: "redirect",
      fb_pixel: "123456789",
    });
    expect(() =>
      utils.enforceLinkCreateOwnershipAndEntitlements(
        app,
        pixelRecord,
        "user00000000001",
        false,
      ),
    ).toThrow("Tracking Pixels requires the Agency plan.");
  });

  it("allows unchanged legacy settings but rejects a locked-field mutation", () => {
    const utils = loadUtils();
    const user = createUser("creator");
    const app = createApp(user);
    const unchanged = createRecord(
      {
        user_id: "user00000000001",
        mode: "direct",
        title: "Updated title",
      },
      {
        user_id: "user00000000001",
        mode: "direct",
        title: "Old title",
      },
    );

    expect(() =>
      utils.enforceLinkFeatureEntitlements(app, unchanged, user, false),
    ).not.toThrow();

    const disablingLegacyOptimization = createRecord(
      {
        user_id: "user00000000001",
        slug: "server-slug",
        mode: "redirect",
        cloaking: false,
        safe_page_url: "https://example.com/safe",
      },
      {
        user_id: "user00000000001",
        slug: "server-slug",
        mode: "redirect",
        cloaking: true,
        safe_page_url: "https://example.com/safe",
      },
    );
    expect(() =>
      utils.enforceLinkFeatureEntitlements(app, disablingLegacyOptimization, user, false),
    ).not.toThrow();

    const changed = createRecord(
      {
        user_id: "user00000000001",
        mode: "direct",
      },
      {
        user_id: "user00000000001",
        mode: "redirect",
      },
    );
    expect(() =>
      utils.enforceLinkFeatureEntitlements(app, changed, user, false),
    ).toThrow("Deeplinks requires the Creator Pro plan.");

    const customSlug = createRecord(
      {
        user_id: "user00000000001",
        slug: "new-custom-slug",
        mode: "redirect",
      },
      {
        user_id: "user00000000001",
        slug: "server-slug",
        mode: "redirect",
      },
    );
    expect(() =>
      utils.enforceLinkFeatureEntitlements(app, customSlug, user, false),
    ).toThrow("Custom slugs require the Agency plan.");
  });

  it("fails closed when a paid account entitlement is expired", () => {
    const utils = loadUtils();
    const user = createUser("agency", false);
    const app = createApp(user);
    const record = createRecord({
      user_id: "user00000000001",
      slug: "custom-campaign",
      mode: "redirect",
      ab_split: true,
      split_urls: ["https://example.com/b"],
    });

    expect(() =>
      utils.enforceLinkCreateOwnershipAndEntitlements(
        app,
        record,
        "user00000000001",
        false,
      ),
    ).toThrow("A/B Traffic Splitter requires the Agency plan.");
    expect(record.values.slug).toBe("a1b2c3d4e5");
  });
});
