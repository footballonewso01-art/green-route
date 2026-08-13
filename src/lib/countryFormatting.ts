const regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

export function normalizeCountryCode(value: unknown): string | null {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  return code;
}

export function getCountryDisplayName(value: unknown): string {
  const original = String(value || "").trim();
  const code = normalizeCountryCode(original);
  if (!code) return original && original.toLowerCase() !== "unknown" ? original : "Unknown";

  try {
    return regionDisplayNames.of(code) || code;
  } catch {
    return code;
  }
}
