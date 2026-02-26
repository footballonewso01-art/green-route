// src/components/icons/detector.ts

const DOMAIN_ICON_MAP: Record<string, string> = {
    "instagram.com": "instagram",
    "www.instagram.com": "instagram",
    "facebook.com": "facebook",
    "www.facebook.com": "facebook",
    "fb.com": "facebook",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "www.youtube.com": "youtube",
    "tiktok.com": "tiktok",
    "www.tiktok.com": "tiktok",
    "twitter.com": "twitter",
    "x.com": "twitter",
    "www.twitter.com": "twitter",
    "t.me": "telegram",
    "telegram.me": "telegram",
    "wa.me": "whatsapp",
    "api.whatsapp.com": "whatsapp",
    "open.spotify.com": "spotify",
    "spotify.com": "spotify",
    "github.com": "github",
    "www.github.com": "github",
    "linkedin.com": "linkedin",
    "www.linkedin.com": "linkedin"
};

/**
 * Attempts to match a given URL to a known preset icon ID based on its hostname.
 * Returns the preset string ID if found, otherwise null.
 */
export function detectIconFromUrl(url: string): string | null {
    try {
        // Basic validation to prevent crashing on incomplete URLs during typing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();

        // Direct match (e.g., www.youtube.com)
        if (DOMAIN_ICON_MAP[hostname]) {
            return DOMAIN_ICON_MAP[hostname];
        }

        // Try matching without www.
        const cleanHostname = hostname.replace(/^www\./, '');
        if (DOMAIN_ICON_MAP[cleanHostname]) {
            return DOMAIN_ICON_MAP[cleanHostname];
        }

        // Partial root match (e.g., handle extra subdomains like my.open.spotify.com)
        for (const knownDomain of Object.keys(DOMAIN_ICON_MAP)) {
            if (hostname.endsWith('.' + knownDomain) || hostname === knownDomain) {
                return DOMAIN_ICON_MAP[knownDomain];
            }
        }

        return null;
    } catch (error) {
        // Invalid URL (user still typing), return null
        return null;
    }
}
