# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-07-25

### Added

- Full right-to-left extraction support: page direction is auto-detected, RTL tables are emitted with column 1 as the rightmost (first logical) column, and mixed Hebrew/English cells are joined in reading order
- Excel exports of RTL documents open with a right-to-left sheet view, and the data preview lays out right-to-left for RTL documents
- "Include Headers" now adds an Excel autofilter to the header row, making the exported sheet filterable
- Fully bilingual status messages: progress, errors, file info, page count, and column labels now follow the selected language

### Changed

- Table extraction rewritten around page-wide column detection (coverage histogram): rows with empty cells keep their remaining cells in the correct columns instead of shifting left, and title or total lines can no longer break column detection
- Row grouping now merges nearby baselines instead of fixed-grid rounding, so slightly wobbly lines are no longer split into separate rows
- Column boundaries use the real rendered item widths from PDF.js (clamped against producer-inflated widths) instead of a character-count estimate
- Overlaid fragments such as decimal points are folded back into their host number ("1 20" plus an overlaid "." now extracts as "1.20")
- Structured data extraction keeps key names: "Name: John" extracts as two cells ("Name", "John") instead of dropping the key
- Cleanup options (Skip Empty Rows, Merge Fragments, Auto-detect Columns) are now non-destructive: unchecking an option restores the original extracted data
- Turnstile verification is required once per session instead of once per file
- "Hebrew/Arabic RTL Support" is now enabled by default (it only activates on documents detected as RTL)

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