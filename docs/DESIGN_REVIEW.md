# AgriBridge visual redesign

Implemented on `feature/location-sessions-verification-uploads`, alongside the existing uncommitted work. No commits, pushes, deployments, or database migrations are part of the redesign.

## Direction

Audience: Kenyan farmers, buyers, field officers and administrators. Goal: help visitors find produce and complete account setup, then keep trading and verification work clear.

Creative thesis: fresh produce photography, generous white space and a soft-green navigation system make the marketplace welcoming and the working portals calm. The signature homepage treatment is the supplied full-width produce photograph with a localized dark gradient behind the white/bright-green headline. No generated photography.

- Pure-white content; soft-green `#EAF7EE` sidebars and testimonial section.
- Primary/action green `#168642`, a small accessibility adjustment to the proposed `#168A45`: white text achieves approximately 4.64:1 contrast. Darker text green `#14783C`; headings `#173D27`.
- Self-hosted Manrope, system-font fallback, consistent 8px spacing rhythm, 16px cards, subtle borders and restrained shadows.
- Mobile navigation collapses; categories stay in a horizontal scrolling row; forms/cards stack.
- SVG iconography uses the existing Font Awesome library and simple inline SVGs. Motion is limited to hover feedback, skeletons and spinners; reduced-motion preferences are respected.

## Functionality

The supplied image replaces text wordmarks. Header links are centred with account actions on the right. Signed-in visitors get cart, dashboard and profile access. Homepage order: hero, categories, how it works, sample testimonials, footer. Categories come from the API with compact local image assets and neutral SVGs for unmapped categories. The four original category links remain available as a fallback.

Public marketplace and product detail HTML remain server rendered, including errors and pagination. Filters, grid/list, cart, saved products, profiles, independent sessions, verification, uploads and farmer-confirmed payment workflows retain their existing rules. The footer uses existing routes instead of creating empty legal/contact links.

Sample testimonial names and quotes are fictional; stock images show models. The section and each profile are labelled. These are not verified customer endorsements. Replace the samples with approved real testimonials before public launch.

## Loading changes

- Split route components into lazy chunks, keeping maps/verification and dashboard code out of the initial homepage route.
- Replace transient text-only loading states with accessible SVG spinners or content skeletons. Real awaiting-confirmation/review/payment statuses remain readable.
- Consolidate two resource hooks into one. Coalesce concurrent GETs by path and current tab/account identity; do not cache private responses.
- Cache only public categories and location reference data for 30 seconds in browser memory. Clear reference caches after mutations/session events. Keep existing results visible while refreshing; throttle focus refreshes and avoid overlapping polling.
- Resolve category-name filters before the product request, eliminating the previous redundant unfiltered product search. Server category reference data has a 30-second cache; product prices/stock remain freshly fetched.
- Serve optimized local responsive WebP images and local fonts. Static assets use a bounded cache; only hashed build JS/CSS receives immutable caching.

This removes identifiable duplicate work, but no live Neon latency or end-user speed percentage is claimed. Slow database/network requests may still require separate profiling.

## Sources and assets

- Logo: user supplied `/home/weru/Downloads/agribridge logo.png`; trimmed transparent padding and resized for the web. Original identity preserved.
- Hero: user supplied `/home/weru/Downloads/heroagribridge.jpg`; WebP variants at 768/1440/1920 pixels. Source photo 1.74 MB; desktop variant approximately 272 KiB, mobile approximately 80 KiB.
- Category photos: reused the four existing project's Unsplash URLs, successfully downloaded and optimized locally. No new licensing claims are made for these pre-existing assets:
  - Vegetables: https://images.unsplash.com/photo-1540420773420-3366772f4999
  - Fruits: https://images.unsplash.com/photo-1619566636858-adf3ef46400b
  - Grains: https://images.unsplash.com/photo-1551754655-cd27e38d2076
  - Roots: https://images.unsplash.com/photo-1518977676601-b53f82aba655
- Stock model photos (Pexels photo pages and license reviewed; downloads verified):
  - Victor Abobade: https://www.pexels.com/photo/portrait-of-african-woman-smiling-20122943/
  - Japhet Kweba: https://www.pexels.com/photo/photo-of-man-smiling-14474733/
  - Noah Denhe: https://www.pexels.com/photo/elegant-african-woman-smiling-in-portrait-30339691/
  - License: https://www.pexels.com/license/ — no implied endorsement; sample labels explicitly distinguish models from fictional profiles.
- Manrope: Google Fonts; SIL Open Font License saved alongside local font files at `client/public/fonts/OFL.txt`.
- Reference browsing: Dribbble grocery website gallery https://dribbble.com/tags/grocery-website and Mobbin web exploration https://mobbin.com/explore/web. Used for compact shopping patterns and clear navigation hierarchy, not copied layouts. These were read through text retrieval, not visually inspected. Awwwards food/drink page timed out and was not used as verified inspiration.

## Review

Run the API and frontend as usual (`python run.py` in server, `npm run dev` in client). No extra frontend dependency installation or new migration is required for this visual redesign. The earlier database-upload migration remains a separate prerequisite if not yet applied.

Manually review desktop, tablet and mobile widths: home navigation and menu, hero crop/contrast, search, category scrolling, marketplace filters/grid/list, login/signup, all role dashboards, sidebar collapse, farm map/uploads, order confirmation and Paystack test checkout. Test focus outlines, keyboard navigation, reduced motion, loading failures and retry controls.

No browser surface is connected in this session. HTTP/render checks and successful builds are not visual, touch, or camera verification.

Completed checks: frontend ESLint, all three Node test files (navigation, sessions/passwords and resource request/cache isolation), client build and SSR build. A disposable local HTTP fixture verified product SSR, fresh prices across requests, one search for category-name filters, server category-reference deduplication, image/font delivery, homepage React rendering and buyer/farmer/admin sidebar rendering. No live Neon speed benchmark or browser screenshot review was performed.
