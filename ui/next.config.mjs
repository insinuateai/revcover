/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { forceSwcTransforms: true },
  async rewrites() {
    const apiUrl = process.env.HELIX_API_URL || process.env.NEXT_PUBLIC_HELIX_API_URL || '';
    // If not set, no rewrites (build still succeeds).
    if (!apiUrl) return [];
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};
export default nextConfig;
