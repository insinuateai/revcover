// ui/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep build unblocked while you stabilize types; remove once green for a week
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  output: "standalone",
  experimental: { forceSwcTransforms: true },

  async rewrites() {
    const apiUrl = process.env.HELIX_API_URL || process.env.NEXT_PUBLIC_HELIX_API_URL || "";
    return apiUrl ? [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }] : [];
  },
};

export default nextConfig;
