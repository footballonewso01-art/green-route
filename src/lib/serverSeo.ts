export interface ServerSeoData {
  faq?: Array<{ question: string; answer: string }>;
  structuredData?: Record<string, unknown>;
}

let activeCollection: ServerSeoData | null = null;

export function beginServerSeoCollection() {
  activeCollection = {};
}

export function collectServerSeo(data: ServerSeoData) {
  if (typeof document !== "undefined" || !activeCollection) return;

  if (data.faq?.length) activeCollection.faq = data.faq;
  if (data.structuredData) activeCollection.structuredData = data.structuredData;
}

export function endServerSeoCollection(): ServerSeoData {
  const result = activeCollection || {};
  activeCollection = null;
  return result;
}
