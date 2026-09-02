# Linktery design system

This records the existing marketing identity and the approved dashboard adaptation.
Scope: visual presentation only; preserve routes, auth, plan limits and billing behavior.

## Shared identity

- Geist Sans for headings and numbers; Inter for interface text; JetBrains Mono for code.
- Brand green: `--landing-accent`, oklch(73.1% 0.1722 156.7).
- Logo: `src/assets/linktery-logo-mark.svg`.
- Marketing tokens remain in `src/styles/landing-rebrand.css`. Do not restyle public pages as part of dashboard work.

## App pages

Modern-minimal, functional workbench: retain the left sidebar, header, existing route hierarchy and useful data density. No marketing hero or decorative imagery inside the application.

New and migrated route layouts consume `DashboardPage`, `DashboardPageHeader`, `DashboardPanel`, `DashboardMetricRail`, `DashboardMetric`, and `DashboardEmptyState` directly in JSX. Route-specific composition belongs in a colocated CSS module; do not reproduce the system by adding route selectors to the global dashboard stylesheet.

- Canvas: `--app-canvas`, oklch(12.8% 0.012 158), a green-tinted charcoal rather than pure black.
- Sidebar: `--app-sidebar`, oklch(14.4% 0.015 158), separated from the canvas by one quiet rule.
- Functional panels reuse the canonical Hero surface: `--app-panel` → `--landing-media`, oklch(19% 0.027 158).
- Raised controls and overlays reuse `--app-panel-strong` → `--landing-media-raised`, oklch(23% 0.031 158).
- Primary text: `--landing-media-text`, oklch(97% 0.006 155).
- Bright green is reserved for primary actions, selection, focus and positive data.
- Errors and warnings keep independent semantic colors and text/icon signals.
- Opaque panels, restrained borders, no decorative glow or glass blur.
- Current-plan context uses a compact dark status pill with a mint icon disc; pale pricing-card surfaces stay inside pricing and marketing sections.
- Help Center category navigation may use small token-based product diagrams as visual wayfinding. Keep them code-native, functional in meaning, and free of stock photography or invented metrics.
- Card radius 20px; pricing cards 24px; controls 12px; primary buttons pill-shaped.
- Spacing uses the existing 4px Tailwind scale. App headings are compact, not marketing-sized.
- Controls retain visible keyboard focus, disabled/loading/error states, and mobile tap targets.
- Motion: short press feedback, restrained entrance; reduced motion removes spatial animation.

## Isolation

`tokens.css` exports app design tokens. `src/styles/dashboard-rebrand.css` is limited to the persistent shell, legacy compatibility variables, and body-portalled Radix content while `.dashboard-shell` is mounted. Page composition lives in the shared primitives and route CSS modules, so it can be edited without selector overrides. The public theme restores automatically on navigation away.

Public profile content keeps its own user-selected styles. No global font resets or build configuration changes.

## Pricing

Marketing and dashboard reuse `LandingPricing` and the canonical `PLANS` catalog. The dashboard variant uses three deliberate landing-derived surfaces: off-white Creator, canonical dark-green Pro, and pale-mint Agency. Pro keeps the bright-green emphasis and the existing authenticated Stripe checkout handler. Current/lower plans remain disabled; monthly/annual selection and exact billed totals stay visible.

## Exports

- CSS tokens: `tokens.css`.
- Reusable route primitives: `src/components/dashboard/DashboardPrimitives.tsx` and its CSS module.
- Tailwind 3 adapter and shadcn compatibility mapping: `src/styles/dashboard-rebrand.css`.
- Existing marketing token definitions: `src/styles/landing-rebrand.css`.

Tailwind v4 role export for future consumers:

```css
@theme {
  --color-background: var(--app-canvas);
  --color-sidebar: var(--app-sidebar);
  --color-card: var(--app-panel);
  --color-popover: var(--app-panel-strong);
  --color-foreground: var(--app-ink);
  --color-muted-foreground: var(--app-muted);
  --color-border: var(--app-rule);
  --color-input: var(--app-control-rule);
  --color-primary: var(--app-accent);
  --color-primary-foreground: var(--app-accent-ink);
  --color-ring: var(--app-focus);
  --font-sans: var(--app-body);
  --font-display: var(--app-display);
  --radius-card: var(--app-radius-card);
  --radius-input: var(--app-radius-control);
}
```

DTCG role export:

```json
{
  "color": {
    "background": { "$type": "color", "$value": "oklch(12.8% 0.012 158)" },
    "sidebar": { "$type": "color", "$value": "oklch(14.4% 0.015 158)" },
    "card": { "$type": "color", "$value": "oklch(19% 0.027 158)" },
    "foreground": { "$type": "color", "$value": "oklch(97% 0.006 155)" },
    "accent": { "$type": "color", "$value": "oklch(73.1% 0.1722 156.7)" }
  },
  "radius": {
    "card": { "$type": "dimension", "$value": "20px" },
    "control": { "$type": "dimension", "$value": "12px" }
  }
}
```

shadcn role export (values are HSL tuples used by the current Tailwind 3 app):

```css
:root:has(.dashboard-shell) {
  --background: 146 44% 6.3%;
  --foreground: 140 18% 96%;
  --card: 145 35% 9.6%;
  --card-foreground: var(--foreground);
  --popover: 145 26% 12%;
  --popover-foreground: var(--foreground);
  --primary: 154 83% 42.5%;
  --primary-foreground: 151 45% 7%;
  --muted: 147 17% 17%;
  --muted-foreground: 146 10% 66%;
  --border: 146 18% 19%;
  --input: 147 11% 39%;
  --ring: var(--primary);
}
```
