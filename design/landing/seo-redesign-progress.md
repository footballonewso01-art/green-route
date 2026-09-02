# SEO redesign — next handoff

## Completed: alternatives

- Updated `/alternatives` and all 18 `/alternatives/:competitorSlug` routes.
- Uses the landing paper/ink/green tokens, Geist + Inter, shared MarketingHeader, and the landing Footer.
- The index is a searchable directory. Detail pages have a compact product-specific introduction, responsive comparison table, product fit, migration checklist, FAQ, and related links.
- All 17 canonical pair-comparison links remain on each alternative page inside an expandable directory.
- Current reviews live in `src/components/alternatives/alternativeReviews.ts`. Do not use the legacy `pricing`, `pros`, `cons`, or `faqAnswer` fields from `src/data/competitors.json` in the new alternatives UI.
- Verified primary-source links are displayed with each review. Unverified entitlements explicitly say to confirm them, rather than claiming a competitor lacks the feature.
- Bento and Koji are migration cases. UrMy.bio has an explicit verification limitation. Flowpage points readers to Flowcode's current FlowHubs offering. FanLink is correctly treated as a music product.
- Alternative SEO title/description fields remain in the shared JSON so browser and prerender metadata match.

## Current batch completed: comparisons

- Reworked all 153 canonical `/compare/:comparisonSlug` pages through `src/pages/CompetitorComparison.tsx`.
- Uses the same landing tokens, Geist + Inter, MarketingHeader, and landing Footer. No old star field, duplicated hero, old logo, or misleading Linktery-first checkmark matrix.
- Compact pair picker, two neutral product briefs, a labelled responsive comparison table, primary sources, specific evaluation notes, an optional Linktery fit panel, FAQ, and 16 related comparison links.
- Pair-neutral content and route helpers live in `src/components/comparisons/comparisonData.ts`; the table consumes the sourced alternative facts, not legacy competitor pricing fields.
- Bento / Koji show retired-service context; UrMy.bio remains explicitly unverified. Availability cells are brief, with full context in the introductory notice.
- Rejects malformed and self-comparison URLs. Alphabetical canonical ordering, all 153 reverse aliases, and the indexability allowlist remain unchanged.
- Visible FAQ and FAQ schema use exactly the same array. Non-indexable comparison pages now retain `noindex, follow` after hydration, matching prerender. The new `followLinksOnNoIndex` option defaults to false, preserving private/system page behavior.
- Corrected the shared display name and SEO labels to FanLink. `https://fanlink.tv` currently redirects to ToneDen; this was checked alongside ToneDen's primary documentation.
- Corrected an inherited alternatives claim: Linktery's splitter uses random equal-probability selection, not configurable weights (verified in `pocketbase/pb_hooks/utils.js` and `main.pb.js`).
- Added useful, feature-specific publication/testing guidance to the nine Features pages that previously failed the SEO content minimum. No product behavior or plan limits changed.

## Verification, 2026-08-31

- TypeScript: passed.
- Targeted ESLint: passed.
- Full suite after the legal/system-page batch: 647 tests passed across 89 files using `npm test -- --maxWorkers=2` (20 comparison tests plus 5 legal/404 regression tests).
- Full build passed: client, SSR, 249 prerendered routes, 110 indexable pages, 153 reverse aliases, SEO validation, and production artifact validation. Nothing deployed.
- Comparison desktop/mobile screenshot QA completed at 1440, 390, and 320 px. Checked table, FAQ, picker navigation, canonical changes, mobile menu, and page width. No horizontal scrolling at those widths.
- The previous browser error tab was gone; existing browser binding reported no tabs, and a normal new tab was used after confirming the local server returned HTTP 200. No policy-blocked page was bypassed.
- Earlier alternatives screenshot QA was not completed in its original batch; don't confuse comparison QA with a full visual audit of every existing route.
- Local Vite remains on `http://127.0.0.1:8085`.

## Current batch completed: legal and public system state

- Reworked `/privacy` and `/terms` with a shared legal-reading shell in `src/components/legal/LegalPageShell.tsx`.
- Preserved the legal copy, numbering, effective date, external links, contact details, and cross-link between the two documents. The redesign only changes presentation and navigation.
- Added a compact legal hero, readable article width, sticky desktop contents, two-column mobile contents, anchored sections with header clearance, and the shared landing header/footer.
- Reworked `/404` as a concise recovery page with the current landing header, a large system-state numeral, and routes back to Home, Features, and Documentation. It deliberately has no promotional footer CTA and keeps `noindex, nofollow`.
- Extended `MarketingHeader` with non-active `legal` and `system` contexts so these pages receive the new chrome without falsely highlighting a product navigation item.
- Added `src/test/legalAndNotFoundRedesign.test.tsx` to protect the legal text, heading order, contents links, canonical metadata, 404 recovery routes, and noindex behavior.
- Browser QA completed at 1440, 390, and 320 px. Confirmed the sticky contents, anchored scroll position, mobile contents layout, mobile navigation, 404 recovery layout, one H1 per page, and no horizontal overflow.
- Production build passed again after this batch: 249 prerendered routes, 110 indexable pages, 153 comparison aliases, SEO validation, and 718 Cloudflare artifact files. Nothing deployed.

## Next batch

- Audit `/open-in-browser` and the remaining user-facing public system flows separately from marketing/SEO pages; keep them task-focused and do not force a full landing footer into redirect or error states.
- `src/pages/ProfessionSolutions.tsx` and the old individual solution files still contain old styles but are **not routed by App.tsx**. All `/solutions/:solutionPath`, including the 15 professions, already use `SolutionDetailPage` and its new content. Do not waste a batch redesigning dead templates or delete them without reviewing imports.
- A later metadata/content consistency audit is useful: some `SEO_PAGES` descriptions still mention weighted rotators or native pre-save capabilities that the current feature pages correctly qualify. Preserve canonical URLs while bringing those descriptions in line with real behavior.

Do not change dashboard styling, publish, commit, or reset the dirty worktree as part of this incremental marketing-page redesign.
