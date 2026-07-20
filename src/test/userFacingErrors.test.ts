import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { maskError } from "@/lib/utils";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("user-facing error boundaries", () => {
  it("never returns stack traces, repository paths, SQL, or raw server messages", () => {
    const fallback = "We couldn't save your changes.";
    const unsafeMessages = [
      "TypeError at D:\\route-smartly-now-main\\src\\main.tsx:42",
      "See https://github.com/linktery/private-repo/issues/17",
      "SQLITE_CONSTRAINT: UNIQUE constraint failed: links.slug",
      "Internal Server Error stack: handler.js:923",
      "Something arbitrary from a third-party SDK",
    ];

    for (const message of unsafeMessages) {
      const visible = maskError({ message }, fallback);
      expect(visible).not.toContain(message);
      expect(visible).toContain(fallback);
    }
  });

  it("keeps only broad, actionable status categories", () => {
    expect(maskError({ status: 401 }, "Failed")).toContain("session");
    expect(maskError({ status: 403 }, "Failed")).toContain("permission");
    expect(maskError({ status: 429 }, "Failed")).toContain("Too many requests");
    expect(maskError({ status: 500, message: "secret" }, "Failed")).not.toContain("secret");
  });

  it("does not send hook internals or stack traces in API responses", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(hook).not.toContain("DEBUG ERROR");
    expect(hook).not.toMatch(/return c\.json\([^\n]*(?:err\.message|e\.toString\(\)|String\(fetchErr\)|stack)/);
    expect(hook).not.toMatch(/throw new BadRequestError\(err\.message\)/);
  });
});
