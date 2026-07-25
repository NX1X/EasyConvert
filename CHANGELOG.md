# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-07-25

### Fixed

- The footer copyright year never appeared: the language initialiser only re-rendered the page when a saved language differed from the current one, so a visitor using the default language kept the static placeholder. The year is now always rendered, and an unrecognised saved language falls back to English instead of blanking the interface
- `LICENSE` carried the closing Apache boilerplate twice: the unfilled `Copyright [yyyy] [name of copyright owner]` template followed by a second copy naming the owner. The appendix now appears once, reading `Copyright 2025-2026 NX1X`, and the rest of the file is byte-identical to the canonical Apache License 2.0 text

### Changed

- The licence notice and copyright now share a single bottom bar, separated by a dot and wrapping cleanly on narrow screens, instead of sitting as two stacked lines above and below the divider
- The licence link is underlined on hover rather than permanently, with a visible keyboard focus state
- `.gitignore` also covers JetBrains and workspace files, Windows shell artefacts, editor backups, and key material (`*.pem`, `*.key`, `*.p12`, `*.pfx`, `.dev.vars`, `.wrangler/`)
- `.cfignore` now excludes environment files and key material as well, so a misconfigured root-directory deploy could not serve them

## [1.5.0] - 2026-07-25

### Added

- New monochrome logo and icon: a grid monogram that forms an "E" from table cells, matching the app's soft-black palette (the previous mark was a blue-to-green gradient that predated the monochrome redesign)
- Proper icon set: PNG favicons (16 and 32), an Apple touch icon, and 192/512 PWA icons alongside the SVG
- Link preview support: a 1200x630 social card (`og-image.png`) plus OpenGraph and Twitter card metadata, so shared links and the GitHub social preview render with the brand card

### Changed

- The PWA manifest now lists raster icons at the sizes installers expect, and the service worker precaches the new favicon set

### Security

- Table extraction hardened against denial-of-service PDFs: the column-detection histogram is built from a difference array (O(items + size) instead of O(rows x size) work), and fragment merging skips rows with more than 400 fragments, so a crafted PDF degrades gracefully instead of freezing the tab
- Excel exports mark formula-leading cells with the Text number format, so an in-place edit in Excel cannot silently convert them into live formulas (cell text stays unmangled)
- The CDN consistency check (`scripts/check-cdn-versions.sh`) now also fails when a cdnjs reference in `index.html` is missing a valid SRI integrity attribute or `crossorigin="anonymous"`, or when the same asset carries different digests, so a stripped or tampered hash can no longer pass CI
- Renovate no longer auto-merges GitHub Actions digest updates (same tag, new SHA); they now require dependency-dashboard approval before merging

### Fixed

- Renovate's custom cdnjs manager now matches the single-quoted library URLs in `app.js` and `sw.js`; previously only `index.html` was tracked, so automated library updates would have left the PDF.js worker and the service-worker cache list on the old version
- The `_worker.js` asset allowlist now matches the icons that actually ship (it previously listed `/icons/icon-192x192.png` and `/icons/icon-512x512.png`, paths that did not exist)

## [1.4.0] - 2026-07-25

### Added

- Full right-to-left extraction support: page direction is auto-detected, RTL tables are emitted with column 1 as the rightmost (first logical) column, and mixed Hebrew/English cells are joined in reading order
- Excel exports of RTL documents open with a right-to-left sheet view, and the data preview lays out right-to-left for RTL documents
- "Include Headers" now adds an Excel autofilter to the header row, making the exported sheet filterable
- Fully bilingual status messages: progress, errors, file info, page count, and column labels now follow the selected language
- Footer now shows the GitHub logo linking to the source repository and an Apache License 2.0 notice (bilingual)
- Release workflow (`.github/workflows/release.yml`): pushing a `v*` tag (or a manual dispatch) creates the GitHub Release with the matching CHANGELOG section as notes

### Changed

- Table extraction rewritten around page-wide column detection (coverage histogram): rows with empty cells keep their remaining cells in the correct columns instead of shifting left, and title or total lines can no longer break column detection
- Row grouping now merges nearby baselines instead of fixed-grid rounding, so slightly wobbly lines are no longer split into separate rows
- Column boundaries use the real rendered item widths from PDF.js (clamped against producer-inflated widths) instead of a character-count estimate
- Overlaid fragments such as decimal points are folded back into their host number ("1 20" plus an overlaid "." now extracts as "1.20")
- Structured data extraction keeps key names: "Name: John" extracts as two cells ("Name", "John") instead of dropping the key
- Cleanup options (Skip Empty Rows, Merge Fragments, Auto-detect Columns) are now non-destructive: unchecking an option restores the original extracted data
- Turnstile verification is required once per session instead of once per file
- "Hebrew/Arabic RTL Support" is now enabled by default (it only activates on documents detected as RTL)
- `scripts/release.sh` reworked for the PR-based flow: it now only validates and pushes the version tag (the version bump and CHANGELOG entry come from the PR, the GitHub Release comes from the release workflow)

### Fixed

- Excel exports no longer prefix cells that start with "=", "+", "-", or "@" with an apostrophe; SheetJS writes string-typed cells that spreadsheet applications never evaluate as formulas, so the CSV-only injection guard now leaves .xlsx cell text unmangled
- CSV export now quotes cells containing carriage returns
- Uploaded filenames only have the final ".pdf" extension stripped (case-insensitive), so names containing ".pdf" elsewhere are no longer mangled
- Removed the misleading "multiple" attribute from the file input (only one file is processed)
- Dropped files with an empty MIME type (some Linux file managers) are accepted when they have a .pdf extension
- The previous PDF document is now destroyed before loading a new one, releasing its memory
- The service worker precaches style.css, app.js, manifest.json, and the icons, so the app works offline instead of loading unstyled
- Replaced spread-based Math.max calls with reduce loops to avoid stack overflows on very large documents

## [1.3.0] - 2026-07-21

### Added

- Published as a public open-source project under the Apache License 2.0
- Subresource Integrity (SRI) pinning for the PDF.js and SheetJS CDN libraries
- Renovate dependency automation: 14-day release cooldown, auto-merge for patch, minor, and security updates, majors reviewed manually, GitHub Actions digest pinning, and a custom manager that keeps the cdnjs library versions in sync across `index.html`, `app.js`, and `sw.js`
- CI security suite: CodeQL, Gitleaks secret scanning, dependency review, a CDN version-consistency check, and a check that enforces SHA-pinned GitHub Actions
- Spreadsheet formula-injection guard (`sanitizeCell`) on CSV and XLSX export

### Changed

- Relicensed from MIT to the Apache License 2.0
- README rewritten for the public release (removed decorative emoji and hyperbole)
- Replaced the Dependabot config with Renovate

### Security

- Content Security Policy hardened: `frame-ancestors 'none'`, expanded Permissions-Policy, `X-Permitted-Cross-Domain-Policies: none`, and explicit Cloudflare Web Analytics allowances
- The `_worker.js` 404 fallback now returns security headers to probe traffic
- `robots.txt` moved into `public/` and added to the asset allowlist
- Internal docs moved to a gitignored `docs-internal/` directory (never published or deployed)

## [1.2.1] - 2026-04-17

### Fixed - Security

- **Repo restructure → `public/` directory**: Cloudflare Pages was deploying the entire repository - documentation, package metadata, config files, and GitHub workflow files were publicly accessible at their URL paths (e.g. `/package.json`, `/docs/TURNSTILE.md`, `/README.md`). `.cfignore` does not work with git-based deployments, so all website assets were moved into `public/` and the Cloudflare Pages build output directory set to `public`
- **Exposed files**: `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json`, `.gitignore`, `docs/DESIGN.md`, `docs/TURNSTILE.md`, `.github/SECURITY.md`, `.github/dependabot.yml`, `.github/workflows/`, `scripts/release.sh`, `scripts/update-version.js`
- **Impact**: Information disclosure only - no secrets, API keys, or credentials were exposed. The Turnstile site key is public by design (embedded in client-side JS)
- **Resolution**: Website files moved to `public/`; Cloudflare Pages serves only from that directory. Non-website files remain at repo root, invisible to the web
- **Audit**: Full details in `docs/SECURITY-AUDIT-2026-04-17.md`

### Changed

- **Repo structure**: all website assets (`index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json`, `_headers`, `_redirects`, icons) moved into `public/` subdirectory
- **`package.json`**: `serve` and `serve-node` scripts updated to serve from `public/`

---

## [1.2.0] - 2026-02-25

### Changed - Architecture

- **File split**: `index.html` refactored into three separate files - `index.html` (markup only), `style.css` (all CSS), `app.js` (all JavaScript + Turnstile loader)
- **No inline event handlers**: all `onclick`, `ondragover`, `ondragleave`, `ondrop` HTML attributes removed; replaced with `addEventListener` calls in `app.js`
- **No inline styles**: all `style="..."` HTML attributes moved to CSS classes and ID rules in `style.css` (`#turnstileContainer`, `#turnstileFallback`, `#customRange`, `.preview-scroll`, `.security-verification-text`, `.contact-byline`, `.header-brand img`, etc.)
- **Turnstile loader**: moved from an inline `<script>` in `<head>` to the top of `app.js`; `app.js` loaded with `defer` - DOM is guaranteed ready when it executes

### Changed - Security

- **CSP `'unsafe-inline'` fully eliminated**: removed from both `script-src` and `style-src` in `_headers`
  - Before: `script-src 'self' 'unsafe-inline' ...`, `style-src 'self' 'unsafe-inline'`
  - After: `script-src 'self' https://cdnjs.cloudflare.com https://challenges.cloudflare.com`, `style-src 'self'`
  - Inline script and style injection are now blocked at the CSP level with no exceptions

### Added

- `id="helpBtn"`, `id="uploadBtn"`, `id="popupClose"`, `id="turnstileReloadBtn"` - added to elements that previously used `onclick` attributes, required for `addEventListener` binding
- CSS classes: `.turnstile-error-title`, `.turnstile-error-desc`, `.turnstile-reload-btn`, `.security-verification-text`, `.preview-scroll`, `.contact-byline` - replace former inline `style="..."` attributes

---

## [1.1.0] - 2026-02-25

### Changed - UI/UX Redesign

- **Color scheme**: full monochrome - primary `#18181b` (soft black), body `#ffffff`, border `#e4e4e7`, mid-grey `#71717a`; all gradients removed
- **Header**: redesigned to a compact 60px top bar - logo + title on the left, language toggle + help button on the right; no longer nested inside `.container`
- **Container**: removed outer box effect (`margin`, `border`, `box-shadow` stripped) - content fills edge-to-edge between header and footer
- **Upload section**: now the hero element; padding reduced from 60px to 40px
- **Feature grid → feature tags**: replaced 6-card marketing grid with a compact pill-tag strip (`Free`, `Private`, `No signup`, `RTL support`) beneath the upload button
- **Share section**: restored as a clean horizontal bar (text left, 6 icon buttons right) with brand-color hover states per platform
- **Padding reductions**: `.main-content` 50px→32px, `.options-section` 40px→24px, `.preview-section` 40px→24px, `.footer` 40px→32px
- **manifest.json**: `background_color` and `theme_color` updated from old purple `#667eea` to `#18181b`

### Changed - i18n

- **Help popup auto-language**: `openHelpGuide()` now calls `switchGuideLanguage(currentLanguage)` - popup opens directly in the active site language
- **Hebrew guide emojis removed**: structural emojis stripped from all Hebrew `<h3>` headings and highlight boxes (`🎯`, `🔶`, `🚀`, `⚙️`)
- **Removed stale translation keys**: `mainDescription`, `rtlBadge`, `feature1-6Title`, `feature1-6Desc`, `shareTitle` (temporarily), `shareDesc` (temporarily)
- **Added translation keys**: `featureTag1`-`featureTag4` in both EN and HE

### Changed - Security

- **CSP - `worker-src`**: fixed from `'self'` to `'self' blob: https://cdnjs.cloudflare.com` - PDF.js fetches its worker from cdnjs then wraps it in a blob URL; previous value was breaking worker instantiation
- **CSP - `img-src`**: added `https://challenges.cloudflare.com` for Turnstile widget images
- **CSP - new directives added**:
  - `object-src 'none'` - blocks plugin-based XSS (Flash etc.)
  - `base-uri 'self'` - prevents `<base>` tag injection attacks
  - `form-action 'self'` - limits form submission targets
  - `upgrade-insecure-requests` - forces all HTTP sub-resources to HTTPS
- **New header**: `Cross-Origin-Resource-Policy: same-origin` - prevents other origins from reading site resources

### Added

- `.gitignore`: created (OS files, editor, Node artifacts, `.env*`, build output, `.claude/` session data)
- `docs/DESIGN.md`: design system reference - colors, layout, CSS variables, component patterns

### Removed

- **Smart scroll button**: floating bounce-animation button
- **"Get Support" email button**
- **Green marketing banner** ("Unlike Other PDF Converters")
- **"100% FREE" header callout box**
- **"Free Service" inline notice**
- **6-card feature grid** (`.feature-grid`, `.feature-card`) and all associated CSS
- **Dead CSS**: `.rtl-badge`, `.header p`, `.header-content` RTL overrides, `@media (max-width: 1200px)` feature-grid breakpoint
- **manifest.json**: removed inline SVG data-URI icons that embedded the old purple color and emoji

## [1.0.0] - 2025-01-14

### Added
- 📚 **Help & Guide Popup**: Comprehensive bilingual user guide (English/Hebrew)
  - Explains tool purpose and optimal use for table extraction
  - Step-by-step usage instructions
  - Best practices for extraction options
  - Future feature roadmap
  - Feature request invitation
- 📧 **Support Email Integration**: Added `support@nx1xlab.dev` for user assistance
  - Dedicated support button in main interface
  - Contact information prominently displayed in help guide
  - Multilingual support button text
- 🏷️ **Version Management**: Implemented proper semantic versioning with package.json
- 📝 **Changelog**: Added comprehensive changelog for tracking releases

### Changed
- 🎯 **Table-Focused Messaging**: Clear communication that tool is optimized for tables
- 🌐 **Language Support**: Enhanced bilingual experience for help content
- 🎨 **UI Enhancement**: Help button positioned for easy access without cluttering interface

### Technical Details
- Added popup overlay system with smooth animations
- Implemented keyboard shortcuts (Escape to close popup)
- Enhanced RTL support for Hebrew guide content
- Added analytics tracking for help guide usage
- Responsive design for help popup across all devices

### Notes
- This is the initial versioned release
- Tool continues to be 100% free with no usage limits
- Privacy-first approach maintained - all processing client-side 