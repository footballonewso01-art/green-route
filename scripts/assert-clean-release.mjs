import { spawnSync } from "node:child_process";
import process from "node:process";

function git(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed.`);
  }

  return result.stdout.trim();
}

const dirtyState = git(["status", "--porcelain", "--untracked-files=all"]);
if (dirtyState) {
  const preview = dirtyState.split("\n").slice(0, 20).join("\n");
  throw new Error(
    [
      "Production frontend deploys require a clean committed checkout.",
      "Use a clean release worktree; do not deploy a mixed local workspace.",
      preview,
    ].join("\n"),
  );
}

const gitSha = git(["rev-parse", "HEAD"]);
console.log(`Clean release checkout confirmed at ${gitSha}.`);
