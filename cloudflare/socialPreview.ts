export interface SocialPreviewProfile {
  id: string;
  name: string;
  bio: string;
  slug: string;
  domain: string;
  avatarFile: string;
  version: string;
}

export interface SocialPreviewAssetPath {
  profileId: string;
  version: string;
}

const PROFILE_ID_PATTERN = /^[a-z0-9]{15}$/;
const PROFILE_VERSION_PATTERN = /^[a-f0-9]{16}$/;

export function parseSocialPreviewImagePath(pathname: string): SocialPreviewAssetPath | null {
  const match = String(pathname || "").match(
    /^\/social-preview\/([a-z0-9]{15})\/([a-f0-9]{16})\.png$/,
  );
  if (!match) return null;
  return { profileId: match[1], version: match[2] };
}

export function isValidSocialPreviewProfile(value: unknown): value is SocialPreviewProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    PROFILE_ID_PATTERN.test(String(profile.id || "")) &&
    PROFILE_VERSION_PATTERN.test(String(profile.version || "")) &&
    typeof profile.name === "string" &&
    typeof profile.bio === "string" &&
    typeof profile.slug === "string" &&
    /^[a-z0-9-]{1,80}$/.test(String(profile.slug || "")) &&
    typeof profile.domain === "string" &&
    (/^$/.test(String(profile.domain)) ||
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(String(profile.domain))) &&
    typeof profile.avatarFile === "string" &&
    String(profile.name).length <= 120 &&
    String(profile.bio).length <= 320 &&
    String(profile.avatarFile).length <= 255
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function collapseText(value: unknown, maxLength: number): string {
  const withoutControls = Array.from(String(value ?? ""), (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  }).join("");
  return withoutControls
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getInitial(name: string, slug: string): string {
  const candidate = collapseText(name || slug, 1).toUpperCase();
  return /^[A-Z0-9]$/.test(candidate) ? candidate : "L";
}

function getNameSize(name: string): number {
  if (name.length > 48) return 40;
  if (name.length > 34) return 46;
  if (name.length > 24) return 54;
  return 68;
}

export function createSocialPreviewCardHtml(
  profile: SocialPreviewProfile,
  avatarUrl: string,
  publicProfileUrl: string,
): string {
  const name = collapseText(profile.name, 72) || `@${collapseText(profile.slug, 80)}`;
  const slug = collapseText(profile.slug, 80);
  const bio = collapseText(profile.bio, 180);
  const initial = getInitial(name, slug);
  const safeAvatarUrl = /^https:\/\/[a-z0-9.-]+(?::\d+)?\//i.test(avatarUrl)
    ? avatarUrl
    : "";
  const safePublicUrl = /^https:\/\/[a-z0-9.-]+(?::\d+)?\/[a-z0-9-]+$/i.test(publicProfileUrl)
    ? publicProfileUrl
    : `https://linktery.com/${encodeURIComponent(slug)}`;
  const displayHost = safePublicUrl.replace(/^https:\/\//i, "");
  const nameSize = getNameSize(name);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1200, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
    body {
      position: relative;
      display: flex;
      align-items: center;
      padding: 74px 82px;
      color: #f7fbf8;
      background: #050806;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .ambient {
      position: absolute;
      inset: -54px;
      background:
        radial-gradient(circle at 18% 22%, rgba(34, 229, 139, .19), transparent 30%),
        linear-gradient(118deg, rgba(4, 9, 6, .97) 18%, rgba(6, 18, 12, .88) 58%, rgba(5, 8, 6, .96));
    }
    .ambient-photo {
      position: absolute;
      inset: -38px;
      width: calc(100% + 76px);
      height: calc(100% + 76px);
      object-fit: cover;
      object-position: center 28%;
      filter: blur(40px) saturate(.88);
      opacity: .27;
      transform: scale(1.08);
    }
    .shade {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(3, 7, 5, .96) 0%, rgba(4, 10, 7, .76) 53%, rgba(4, 9, 6, .86) 100%),
        linear-gradient(180deg, rgba(255,255,255,.025), transparent 30%, rgba(0,0,0,.2));
    }
    .frame {
      position: absolute;
      inset: 22px;
      border: 1px solid rgba(93, 135, 113, .25);
      border-radius: 36px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
    }
    .portrait-wrap {
      position: relative;
      flex: 0 0 314px;
      height: 314px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: rgba(7, 19, 13, .86);
      border: 2px solid rgba(34, 229, 139, .72);
      box-shadow:
        0 0 0 12px rgba(34, 229, 139, .055),
        0 28px 70px rgba(0, 0, 0, .42);
      overflow: hidden;
    }
    .portrait {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 24%;
      display: block;
    }
    .initial {
      font-size: 118px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -.08em;
      color: #22e58b;
      transform: translateX(-6px);
    }
    .route {
      position: relative;
      width: 72px;
      height: 2px;
      margin: 0 30px;
      background: linear-gradient(90deg, rgba(34,229,139,.8), rgba(34,229,139,.08));
    }
    .route::before {
      content: '';
      position: absolute;
      left: -4px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22e58b;
      box-shadow: 0 0 18px rgba(34,229,139,.7);
    }
    .identity {
      position: relative;
      min-width: 0;
      max-width: 566px;
      padding-bottom: 10px;
    }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 18px;
      color: #67f1ad;
      font-size: 15px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: .2em;
      text-transform: uppercase;
    }
    .eyebrow-mark {
      width: 23px;
      height: 23px;
      display: grid;
      place-items: center;
      border-radius: 7px;
      color: #03140b;
      background: #22e58b;
      font-size: 16px;
      letter-spacing: 0;
    }
    h1 {
      margin: 0;
      max-width: 566px;
      overflow: hidden;
      color: #f8fbf9;
      font-size: ${nameSize}px;
      line-height: .98;
      font-weight: 800;
      letter-spacing: -.052em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .handle {
      margin-top: 15px;
      color: #a9bbb1;
      font-size: 27px;
      line-height: 1.1;
      font-weight: 600;
      letter-spacing: -.025em;
    }
    .bio {
      max-width: 555px;
      min-height: 52px;
      margin: 23px 0 0;
      overflow: hidden;
      color: #c9d5ce;
      font-size: 21px;
      line-height: 1.28;
      font-weight: 500;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .url {
      position: absolute;
      left: 82px;
      bottom: 49px;
      color: #74877c;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: .045em;
    }
    .brand {
      position: absolute;
      right: 74px;
      top: 54px;
      display: flex;
      align-items: center;
      gap: 11px;
      color: #e6eee9;
      font-size: 17px;
      font-weight: 800;
      letter-spacing: .17em;
    }
    .brand-arrow { color: #22e58b; font-size: 22px; letter-spacing: 0; }
  </style>
</head>
<body>
  <div class="ambient"></div>
  ${safeAvatarUrl ? `<img class="ambient-photo" src="${escapeHtml(safeAvatarUrl)}" alt="">` : ""}
  <div class="shade"></div>
  <div class="frame"></div>
  <div class="brand"><span class="brand-arrow">↗</span><span>LINKTERY</span></div>
  <div class="portrait-wrap">
    ${safeAvatarUrl
      ? `<img class="portrait" src="${escapeHtml(safeAvatarUrl)}" alt="">`
      : `<div class="initial">${escapeHtml(initial)}</div>`}
  </div>
  <div class="route"></div>
  <div class="identity">
    <div class="eyebrow"><span class="eyebrow-mark">↗</span><span>Public profile</span></div>
    <h1>${escapeHtml(name)}</h1>
    <div class="handle">@${escapeHtml(slug)}</div>
    ${bio ? `<p class="bio">${escapeHtml(bio)}</p>` : '<p class="bio">Everything worth opening, in one place.</p>'}
  </div>
  <div class="url">${escapeHtml(displayHost)}</div>
</body>
</html>`;
}
