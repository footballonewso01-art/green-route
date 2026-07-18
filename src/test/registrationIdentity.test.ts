import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("registration account identity", () => {
  it("derives a password signup account name on the server without rendering a name input", () => {
    const source = readWorkspaceFile("src/pages/RegisterPage.tsx");

    expect(source).toContain("username: cleanUsername");
    expect(source).not.toMatch(/^\s*name:\s*cleanUsername,?\s*$/m);
    expect(source).not.toContain('const [name, setName]');
    expect(source).not.toContain('placeholder="Your name"');
  });

  it("enforces the same invariant for direct PocketBase user creation", () => {
    const source = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(source).toContain('e.record.set("name", username);');
  });
});
