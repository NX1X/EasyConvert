export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Allowlist: only serve known website assets
    const allowed = [
      '/', '/index.html', '/style.css', '/app.js', '/sw.js',
      '/manifest.json', '/robots.txt',
      '/easyconvert-logo.svg', '/easyconvert-icon.svg',
      '/nx1xlab-logo.png', '/nx1xlab-logo.ico',
      '/icons/icon-192x192.png', '/icons/icon-512x512.png'
    ];

    if (allowed.includes(path)) {
      return env.ASSETS.fetch(request);
    }

    // Non-allowlisted paths never reach env.ASSETS.fetch(), so _headers is not
    // applied here. Attach a hardened baseline directly so probe/scanner traffic
    // still receives security headers.
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'no-referrer'
      }
    });
  }
};
