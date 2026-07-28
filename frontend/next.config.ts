import type { NextConfig } from "next";

const backendHost =
  process.env.BACKEND_HOSTPORT ?? "127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `http://${backendHost}/:path*`,
      },
    ];
  },
};

export default nextConfig;
