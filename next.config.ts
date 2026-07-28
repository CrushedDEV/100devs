import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a lockfile further up the tree would otherwise be
  // picked as the inferred root.
  turbopack: { root: path.resolve(__dirname) },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },

  experimental: {
    // Server actions receive small JSON payloads only (ids and orderings).
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
