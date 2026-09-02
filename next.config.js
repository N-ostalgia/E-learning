/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "pub-daf831a105dc42edbc9c93f61c30a98b.r2.dev",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",  // 👈 Add this for the avatar service
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",  // For GitHub avatars
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",  // For Google avatars
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;