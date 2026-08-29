import { describe, expect, it } from "vitest";
import { getAdditionalDomainRecords, getDomainDnsStep, getDomainSetupState } from "@/lib/customDomainSetup";
import type { CustomDomainRecord } from "@/lib/customDomains";

const domain = (overrides: Partial<CustomDomainRecord> = {}): CustomDomainRecord => ({
  id: "domain000000001",
  hostname: "brand.example",
  target_type: "profile",
  target_id: "profile00000001",
  status: "pending",
  hostname_status: "pending",
  ssl_status: "pending",
  ownership_verified: false,
  cname: { name: "brand.example", value: "domains.linktery.com" },
  ownership: { type: "txt", name: "_linktery-verification.brand.example", value: "proof" },
  ssl_validation: { type: "txt", name: "", value: "" },
  last_checked_at: "",
  activated_at: "",
  created: "",
  updated: "",
  ...overrides,
});

describe("custom domain setup guidance", () => {
  it("distinguishes missing ownership, provider validation and ready states", () => {
    expect(getDomainSetupState(domain()).label).toBe("Waiting for DNS");
    expect(getDomainSetupState(domain({
      ownership_verified: true,
      hostname_status: "ownership_pending",
      hostname_validation: { type: "txt", name: "_cf-custom-hostname.brand.example", value: "token" },
    })).label).toBe("Finish DNS setup");
    expect(getDomainSetupState(domain({ status: "active", ownership_verified: true, hostname_status: "active", ssl_status: "active" })).label).toBe("HTTPS ready");
  });

  it("deduplicates certificate records and hides completed validation", () => {
    const pending = domain({
      ownership_verified: true,
      hostname_status: "active",
      ssl_status: "pending_validation",
      ssl_validations: [
        { type: "txt", name: "_acme-challenge.brand.example", value: "token" },
        { type: "txt", name: "_acme-challenge.brand.example", value: "token" },
      ],
    });
    expect(getAdditionalDomainRecords(pending)).toHaveLength(1);
    expect(getAdditionalDomainRecords({ ...pending, ssl_status: "active" })).toHaveLength(0);
  });

  it("reveals only the record required for the current setup step", () => {
    const ownership = getDomainDnsStep(domain());
    expect(ownership.number).toBe(1);
    expect(ownership.records.map((record) => record.label)).toEqual(["Ownership"]);

    const certificate = getDomainDnsStep(domain({
      ownership_verified: true,
      hostname_validation: { type: "txt", name: "_cf-custom-hostname.brand.example", value: "token" },
    }));
    expect(certificate.number).toBe(2);
    expect(certificate.records.map((record) => record.label)).toEqual(["Domain verification"]);

    const traffic = getDomainDnsStep(domain({
      status: "active",
      ownership_verified: true,
      hostname_status: "active",
      ssl_status: "active",
    }));
    expect(traffic.number).toBe(3);
    expect(traffic.records.map((record) => record.label)).toEqual(["Traffic"]);
  });
});
