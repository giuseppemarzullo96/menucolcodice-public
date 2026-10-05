/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    domains: [
      "images.pexels.com",
      "images.unsplash.com",
      "img.freepik.com",
      "res.cloudinary.com",
    ],
  },
  async rewrites() {
    return [{ source: "/menu-col-codice.vcf", destination: "/api/contatto-whatsapp" }];
  },
  async headers() {
    return [
      {
        source: "/stickers/:path*",
        headers: [
          { key: "Content-Type", value: "image/webp" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/adminnewpage", destination: "/admin", permanent: true }];
  },
};

module.exports = nextConfig;
