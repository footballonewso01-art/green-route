export const dollarsToCents = (rawValue: string): number | null => {
  const normalized = rawValue.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const whole = Number(wholePart);
  if (!Number.isSafeInteger(whole)) return null;

  const fraction = Number((fractionPart + "00").slice(0, 2));
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
};
