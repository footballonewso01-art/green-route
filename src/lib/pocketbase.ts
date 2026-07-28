import PocketBase from 'pocketbase';

const configuredPocketBaseUrl =
  import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pocketBaseUrl = configuredPocketBaseUrl.replace(/\/+$/, '');
export const publicApiBaseUrl = `${pocketBaseUrl}/api/v1`;

export const pb = new PocketBase(pocketBaseUrl);

// Optional: you can export types here or in a separate file
export type { RecordModel } from 'pocketbase';
