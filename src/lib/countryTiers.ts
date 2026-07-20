import { COUNTRIES } from "@/lib/countries";

export type CountryTierKey = "TIER_1" | "TIER_2" | "TIER_3";

const TIER_1_CODES = [
  "AU", "AT", "BE", "CA", "DK", "FI", "FR", "DE", "IS", "IE", "IL", "IT", "JP",
  "LU", "NL", "NZ", "NO", "SA", "SG", "KR", "ES", "SE", "CH", "AE", "GB", "US",
] as const;

const TIER_2_CODES = [
  "AD", "AR", "BS", "BH", "BO", "BA", "BR", "BN", "BG", "CL", "CN", "CO", "CR",
  "HR", "CY", "CZ", "DO", "EC", "EG", "EE", "GR", "HU", "IN", "ID", "KZ", "KW",
  "LV", "LT", "MY", "MT", "MX", "ME", "MA", "OM", "PA", "PY", "PE", "PH", "PL",
  "PT", "QA", "RO", "RS", "SK", "SI", "ZA", "TH", "TR", "UY", "VU",
] as const;

const TIER_1_SET = new Set<string>(TIER_1_CODES);
const TIER_2_SET = new Set<string>(TIER_2_CODES);
const TIER_3_CODES = COUNTRIES
  .map((country) => country.code)
  .filter((code) => !TIER_1_SET.has(code) && !TIER_2_SET.has(code));

export const COUNTRY_TIER_PACKS: ReadonlyArray<{
  key: CountryTierKey;
  label: string;
  description: string;
  codes: readonly string[];
}> = [
  {
    key: "TIER_1",
    label: "Tier 1",
    description: "Premium ad markets",
    codes: TIER_1_CODES,
  },
  {
    key: "TIER_2",
    label: "Tier 2",
    description: "Growth markets",
    codes: TIER_2_CODES,
  },
  {
    key: "TIER_3",
    label: "Tier 3",
    description: "Broad-reach markets",
    codes: TIER_3_CODES,
  },
];

export function isCountryTierKey(value: string): value is CountryTierKey {
  return value === "TIER_1" || value === "TIER_2" || value === "TIER_3";
}

export function getCountryTierKey(countryCode: string): CountryTierKey {
  const normalized = countryCode.trim().toUpperCase();
  if (TIER_1_SET.has(normalized)) return "TIER_1";
  if (TIER_2_SET.has(normalized)) return "TIER_2";
  return "TIER_3";
}

export function getCountryTierPack(key: CountryTierKey) {
  return COUNTRY_TIER_PACKS.find((pack) => pack.key === key);
}
