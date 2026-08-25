const isDevelopment = process.env.NODE_ENV === 'development';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  {key: 'Cache-Control', value: 'private, no-store, max-age=0'},
  {key: 'Content-Security-Policy', value: contentSecurityPolicy},
  {key: 'Cross-Origin-Opener-Policy', value: 'same-origin'},
  {key: 'Cross-Origin-Resource-Policy', value: 'same-origin'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'},
  {key: 'Referrer-Policy', value: 'no-referrer'},
  {key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload'},
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'X-DNS-Prefetch-Control', value: 'off'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet, noimageindex'},
];

const nextConfig = {
  agentRules: false,
  images: {unoptimized: true},
  trailingSlash: false,
  poweredByHeader: false,
  async headers() {
    return [{source: '/:path*', headers: securityHeaders}];
  },
};

export default nextConfig;
