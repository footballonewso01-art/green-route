import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

class HookRequestError extends Error {}

// Match PocketBase's JSONRaw behavior: get() returns bytes, getString()
// returns the actual JSON document for both JSON and multipart requests.
const createRecord = (serialized: string, originalSerialized?: string) => ({
  get: () => Array.from(Buffer.from(serialized, "utf8")),
  getString: () => serialized,
  original: () => originalSerialized === undefined ? { id: "" } : {
    id: "profile00000001",
    getString: () => originalSerialized,
  },
});

const source = readFileSync(resolve(process.cwd(), "pocketbase/pb_hooks/utils.js"), "utf8");
const module = { exports: {} };
runInNewContext(source, { module, BadRequestError: HookRequestError });
const validate = (module.exports as {
  validateProfileSocialLinks: (record: ReturnType<typeof createRecord>) => void;
}).validateProfileSocialLinks;

describe("Public Profile social-link validation with real JSONRaw semantics", () => {
  it.each(["", "null", '""', "[]", '[{"id":"draft","url":""}]',
    '[{"id":"draft","url":"  "}]', '[{"id":"draft"}]', '[{"id":"draft","url":null}]'])("allows empty or unfinished editor values: %s", (serialized) => {
    expect(() => validate(createRecord(serialized))).not.toThrow();
  });

  it.each([
    "https://t.me/example", "http://example.com/profile", "HTTPS://example.com/PROFILE",
    "  https://youtube.com/@example  ", "https://example.com/имя?x=1&y=2#bio",
    "https://пример.рф/профиль",
  ])("preserves ordinary HTTP(S) links: %s", (url) => {
    const record = createRecord(JSON.stringify([{ id: "website", url }]));
    expect(() => validate(record)).not.toThrow();
    expect(JSON.parse(record.getString())[0].url).toBe(url);
  });

  it.each([
    "javascript:void(0)", "JaVaScRiPt:void(0)", "data:text/html,hello",
    "file:///tmp/test", "//example.com", "example.com", "mailto:test@example.com",
    "https://", "https://?query", "https://#fragment", "https://exa\nmple.com",
  ])("rejects newly supplied invalid links: %s", (url) => {
    const serialized = JSON.stringify([{ id: "website", url }]);
    expect(() => validate(createRecord(serialized))).toThrow(HookRequestError);
    expect(() => validate(createRecord(serialized, "[]"))).toThrow(HookRequestError);
  });

  it.each(["{bad json", "{}", "true", "42", '"https://example.com"',
    "[null]", "[123]", "[[]]", '["https://example.com"]',
    '[{"url":false}]', '[{"url":123}]', '[{"url":{}}]'])("rejects malformed data rather than iterating bytes: %s", (serialized) => {
    expect(() => validate(createRecord(serialized))).toThrow(HookRequestError);
  });

  it("does not block unrelated edits to unchanged legacy invalid social links", () => {
    const legacy = JSON.stringify([{ id: "website", url: "example.com/legacy" }]);
    expect(() => validate(createRecord(legacy, legacy))).not.toThrow();
    // Whitespace in the JSON transport is not a social-link edit.
    expect(() => validate(createRecord(JSON.stringify(JSON.parse(legacy), null, 2), legacy))).not.toThrow();
    // PocketBase may reorder object keys when JSON travels through FormData.
    expect(() => validate(createRecord('[{"url":"example.com/legacy","id":"website"}]', legacy))).not.toThrow();
    const changed = JSON.stringify([{ id: "website", url: "javascript:void(0)" }]);
    expect(() => validate(createRecord(changed, legacy))).toThrow(HookRequestError);
    expect(() => validate(createRecord("[]", legacy))).not.toThrow();
    expect(() => validate(createRecord(JSON.stringify([{ id: "website", url: "https://example.com/fixed" }]), legacy))).not.toThrow();
  });
});
