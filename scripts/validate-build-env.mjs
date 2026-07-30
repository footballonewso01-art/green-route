import path from "node:path";
import process from "node:process";
import { loadEnv } from "vite";

const mode = process.argv[2];
if (!["production", "staging"].includes(mode)) {
  throw new Error("Build mode must be either production or staging.");
}

const workspace = process.cwd();
const fileEnv = loadEnv(mode, workspace, "");
const readEnv = (name) => process.env[name] ?? fileEnv[name] ?? "";

const expected = {
  production: {
    deployEnv: "production",
    pocketBaseOrigin: "https://greenroute-pb.fly.dev",
  },
  staging: {
    deployEnv: "staging",
    pocketBaseOrigin: "https://greenroute-pb-staging.fly.dev",
  },
}[mode];

const requiredDomains = [
  "linktery.com",
  "linktery.bio",
  "hotme.online",
  "hotmylinks.cc",
];

const failures = [];
const deployEnv = readEnv("VITE_DEPLOY_ENV").trim();
const configuredPocketBaseUrl = readEnv("VITE_POCKETBASE_URL").trim();
const configuredDomains = readEnv("VITE_AVAILABLE_DOMAINS")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

if (deployEnv !== expected.deployEnv) {
  failures.push(
    `VITE_DEPLOY_ENV must be "${expected.deployEnv}" for a ${mode} build.`,
  );
}

try {
  const pocketBaseUrl = new URL(configuredPocketBaseUrl);
  if (pocketBaseUrl.origin !== expected.pocketBaseOrigin) {
    failures.push(
      `VITE_POCKETBASE_URL must use ${expected.pocketBaseOrigin} for a ${mode} build.`,
    );
  }
  if (
    pocketBaseUrl.protocol !== "https:" ||
    pocketBaseUrl.username ||
    pocketBaseUrl.password ||
    pocketBaseUrl.pathname !== "/" ||
    pocketBaseUrl.search ||
    pocketBaseUrl.hash
  ) {
    failures.push("VITE_POCKETBASE_URL must be a credential-free HTTPS origin.");
  }
} catch {
  failures.push("VITE_POCKETBASE_URL must be a valid absolute URL.");
}

if (configuredDomains[0] !== requiredDomains[0]) {
  failures.push("VITE_AVAILABLE_DOMAINS must list linktery.com first.");
}
if (
  configuredDomains.length !== requiredDomains.length ||
  requiredDomains.some((domain) => !configuredDomains.includes(domain))
) {
  failures.push(
    `VITE_AVAILABLE_DOMAINS must contain exactly: ${requiredDomains.join(", ")}.`,
  );
}

if (failures.length) {
  console.error(`Build environment validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Build environment validated for ${mode}: ${expected.pocketBaseOrigin}`,
);
