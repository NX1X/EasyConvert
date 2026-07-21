# EasyConvert

[![CI](https://github.com/NX1X/EasyConvert/actions/workflows/ci.yml/badge.svg)](https://github.com/NX1X/EasyConvert/actions/workflows/ci.yml)
[![CodeQL](https://github.com/NX1X/EasyConvert/actions/workflows/codeql.yml/badge.svg)](https://github.com/NX1X/EasyConvert/actions/workflows/codeql.yml)
[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/NX1X/EasyConvert/releases)
[![License](https://img.shields.io/badge/License-Apache%202.0-informational.svg)](LICENSE)
[![Built](https://img.shields.io/badge/Built-June%202025-blue.svg)](#)
[![Views](https://hits.sh/github.com/NX1X/EasyConvert.svg?label=Views&color=blue)](https://hits.sh/github.com/NX1X/EasyConvert/)

A client-side PDF to Excel/CSV converter built with vanilla JavaScript. It specializes in extracting tables from PDF documents, processes everything locally in the browser, and supports right-to-left (Hebrew and Arabic) text.

A project by [NX1X Lab](https://nx1xlab.dev).

> This is a small personal project, maintained on an as-needed basis. It is not accepting external contributions or feature requests.

## Overview

EasyConvert reads a PDF entirely in the browser using PDF.js, detects tabular data, and exports it as an `.xlsx` (via SheetJS) or `.csv` file. No file ever leaves the device: there is no server, no upload, and no data collection. It is deployed as a static site on Cloudflare Pages and installable as a Progressive Web App.

## Features

- Client-side processing - files are never uploaded to a server
- Table-focused extraction with multiple detection methods
- Excel (`.xlsx`) and CSV export
- Right-to-left support for Hebrew and Arabic
- Bilingual interface (English and Hebrew)
- Installable PWA with offline caching
- No signup, no file-size limit, no tracking of file content

## Tech Stack

| Area | Choice |
| --- | --- |
| PDF parsing | PDF.js (cdnjs, Subresource Integrity pinned) |
| Spreadsheet export | SheetJS / xlsx (cdnjs, SRI pinned) |
| Application code | Vanilla JavaScript, no framework |
| Styling | Plain CSS (Grid and Flexbox) |
| PWA | Service Worker + Web App Manifest |
| Bot protection | Cloudflare Turnstile |
| Hosting | Cloudflare Pages (static) |

## Repository Layout

```
EasyConvert/
├── public/                 # The deployable site (Cloudflare output directory)
│   ├── index.html          # Markup
│   ├── style.css           # Styles
│   ├── app.js              # Application logic
│   ├── sw.js               # Service worker
│   ├── manifest.json       # PWA manifest
│   ├── _headers            # Cloudflare Pages response headers (CSP etc.)
│   ├── _redirects          # Cloudflare Pages redirects
│   ├── _worker.js          # Asset allowlist worker
│   └── *.svg / *.png / *.ico
├── .github/
│   ├── renovate.json       # Dependency automation
│   └── workflows/          # CodeQL, Gitleaks, dependency review, CI
├── scripts/                # Version + release helpers, CDN version check
├── package.json
├── CHANGELOG.md
└── LICENSE
```

## Security

- **Content Security Policy** with no `'unsafe-inline'` (all JS and CSS are external files, no inline handlers).
- **Subresource Integrity** on the CDN-hosted PDF.js and SheetJS libraries.
- **Strict response headers**: HSTS (preload), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.
- **Spreadsheet formula-injection guard** on CSV and XLSX export.
- **Supply chain**: committed lockfile, GitHub Actions pinned to commit SHAs, Renovate with a 14-day release cooldown, and CI that scans for secrets (Gitleaks), reviews dependencies, runs CodeQL, and verifies CDN versions stay in sync.

## Running Locally

The site is static; serve the `public/` directory with any static file server:

```bash
# Python
python -m http.server 8000 -d public

# Node
npx serve public
```

Then open `http://localhost:8000`.

## Deployment (Cloudflare Pages)

The repository is deployed as a static site. To serve only the site directory and keep the rest of the repository private, set the build output directory to `public`.

1. In the Cloudflare dashboard, create a Pages project and connect this repository.
2. Build settings:
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `public`
   - **Root directory**: `/`
3. Deploy. Only the contents of `public/` are published; everything else in the repository (docs, CI config, package files) is never served.

`public/_headers` applies the security headers and `public/_redirects` handles routing. No environment variables are required.

## Usage

1. Upload a PDF (drag and drop, or click to browse).
2. Choose an extraction method and options.
3. Review the extracted data in the preview table.
4. Download as Excel or CSV.

Extraction methods: Smart Table Detection, Text Extraction, Structured Data, and Advanced Table Detection.

## Versioning

This project follows [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Credits

- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF parsing
- [SheetJS](https://sheetjs.com/) - spreadsheet generation
- [Cloudflare Pages](https://pages.cloudflare.com/) - hosting

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
