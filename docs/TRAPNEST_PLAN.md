# Trapnest Spirit delivery record

User-authorized scope, September 4, 2026. Implemented after the source-derived reconstruction work recorded in `COVERAGE.md`.

1. Rebrand title, topic, metadata, OG metadata, navigation/browser tab and related public-facing identity to **Trapnest Spirit**, a sub-project of [Trapnest](https://henrywithu.com/).
2. Keep the existing loading-page and gate-page logos unless a genuinely comparable replacement preserves their visual style and effects.
3. Create an illustration-led OG image with minimal text and a matching favicon.
4. Prepare deployment to Cloudflare Workers at `https://spirit.henrywithu.com`. Preparation does not authorize account/DNS changes or production deployment.
5. Change gate question to **Do you know L.A.S.T.?** Yes enters the experience. No shows **access denied** and **You may want to visit Trapnest.**
6. Replace the main-page **the notturno experience** with **the Trapnest Experience**.
7. Remove footer Instagram, email and Legal. Replace credits with **Made by Trapnest**, linking Trapnest to `https://henrywithu.com/`.
8. Rebrand lettering on all three bottles to **Trapnest Spirit**, matching the existing typography/artwork style, including the associated texture/atlas and scene variants.

## Verification

- Both L.A.S.T. gate branches were exercised in a fresh browser session.
- Main title, top-left identity, editorial copy, three-bottle scene, product bottle, product marker and footer were visually inspected at 1280 × 720.
- `npm run check:brand` verifies metadata, canonical URL, gate copy, footer destination, bottle asset wiring, Workers SPA configuration and the 1200 × 630 OG image.
- `npm run check:assets` confirms the captured evidence remains byte-identical and excluded from application imports.
- `npm run check:render` and `npm run build` pass.
- A local Wrangler preview returned 200 for `/`, navigation fallback `/deep/link`, and the OG asset with the expected HTML/security/cache headers.

No Cloudflare account, DNS record, custom domain or production deployment was changed.
