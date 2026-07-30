import PocketBase from 'pocketbase';

const configuredPocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL?.trim();

if (!configuredPocketBaseUrl) {
  throw new Error("Linktery API configuration is unavailable.");
}

const parsedPocketBaseUrl = new URL(configuredPocketBaseUrl);
if (!["http:", "https:"].includes(parsedPocketBaseUrl.protocol)) {
  throw new Error("Linktery API configuration is invalid.");
}

export const pocketBaseUrl = parsedPocketBaseUrl.origin;

export const pb = new PocketBase(pocketBaseUrl);

// Optional: you can export types here or in a separate file
export type { RecordModel } from 'pocketbase';
