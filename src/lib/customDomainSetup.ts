import type { CustomDomainRecord } from "./customDomains";

export interface DomainDnsRecord {
  label: string;
  type: string;
  name: string;
  value: string;
}

export interface DomainDnsStep {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  records: DomainDnsRecord[];
}

export function getAdditionalDomainRecords(domain: CustomDomainRecord): DomainDnsRecord[] {
  const candidates: DomainDnsRecord[] = [];
  if (domain.hostname_status !== "active" && domain.hostname_validation) {
    candidates.push({ ...domain.hostname_validation, label: "Domain verification" });
  }
  if (domain.ssl_status !== "active") {
    const records = domain.ssl_validations?.length ? domain.ssl_validations : [domain.ssl_validation];
    records.filter(Boolean).forEach((record) => candidates.push({ ...record, label: "HTTPS verification" }));
  }
  const seen = new Set<string>();
  return candidates.filter((record) => {
    if (!record.name || !record.value) return false;
    const key = `${record.type.toUpperCase()}:${record.name.toLowerCase()}:${record.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getDomainSetupState(domain: CustomDomainRecord) {
  if (domain.status === "active") {
    return {
      label: "HTTPS ready",
      description: "Your domain is ready to open its destination once the traffic record points to Linktery.",
      tone: "ready" as const,
    };
  }
  if (domain.status === "failed") {
    return {
      label: "Needs attention",
      description: "Domain validation did not complete. Review the DNS records below, then check the connection again.",
      tone: "error" as const,
    };
  }
  if (!domain.ownership_verified) {
    return {
      label: "Waiting for DNS",
      description: "Add the DNS records below at your domain provider, then check the connection.",
      tone: "pending" as const,
    };
  }
  if (getAdditionalDomainRecords(domain).length) {
    return {
      label: "Finish DNS setup",
      description: "Ownership is verified. Add the extra verification records below to finish setting up HTTPS.",
      tone: "pending" as const,
    };
  }
  return {
    label: domain.ssl_status === "active" ? "Activating domain" : "Preparing HTTPS",
    description: "Ownership is verified. Setup is still processing; no additional records are needed right now. Check again shortly.",
    tone: "pending" as const,
  };
}

export function getDomainDnsStep(domain: CustomDomainRecord): DomainDnsStep {
  if (!domain.ownership_verified) {
    return {
      number: 1,
      title: "Verify domain ownership",
      description: "Add this TXT record first. Linktery will not create a public hostname until ownership is verified.",
      records: [{ label: "Ownership", type: domain.ownership.type || "TXT", name: domain.ownership.name, value: domain.ownership.value }],
    };
  }

  const validationRecords = getAdditionalDomainRecords(domain);
  if (validationRecords.length > 0) {
    return {
      number: 2,
      title: "Activate HTTPS",
      description: "Add the verification record shown below. Keep it in DNS so certificate renewals continue to work.",
      records: validationRecords,
    };
  }

  if (domain.status !== "active") {
    return {
      number: 2,
      title: "HTTPS is being prepared",
      description: "No DNS changes are needed right now. Linktery will keep checking automatically; you can also use Check to refresh the status.",
      records: [],
    };
  }

  return {
    number: 3,
    title: "Point traffic to Linktery",
    description: "Add this final CNAME only after HTTPS is ready. It sends visitors at this hostname to the selected Link or Public Profile.",
    records: [{ label: "Traffic", type: "CNAME", ...domain.cname }],
  };
}
