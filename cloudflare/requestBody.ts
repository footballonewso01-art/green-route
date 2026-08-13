export type BoundedBodyResult =
  | { ok: true; body: ArrayBuffer }
  | { ok: false; reason: "too_large" | "unreadable" };

/**
 * Reads an incoming body without ever buffering more than maxBytes.
 * Cloudflare may accept request bodies much larger than an individual
 * application route, so checking Content-Length alone is not sufficient.
 */
export async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedBodyResult> {
  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const declaredLength = Number(rawLength);
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > maxBytes
    ) {
      return { ok: false, reason: "too_large" };
    }
  }

  if (!request.body) return { ok: true, body: new ArrayBuffer(0) };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("request body limit exceeded");
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    try {
      await reader.cancel("request body could not be read");
    } catch {
      // The stream may already be errored or closed.
    }
    return { ok: false, reason: "unreadable" };
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: output.buffer };
}
