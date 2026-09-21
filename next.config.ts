import type { NextConfig } from "next";

import { createSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  deploymentId: process.env.DEPLOYMENT_VERSION,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: createSecurityHeaders(process.env.NODE_ENV),
      },
    ];
  },
};

export default nextConfig;
