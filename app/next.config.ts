import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Import of POS backups can be a few MB.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
