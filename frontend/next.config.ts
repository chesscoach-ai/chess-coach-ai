import type { NextConfig } from "next";

const backendUrl = (
  process.env.BACKEND_URL ??
  (process.env.BACKEND_HOSTPORT
    ? `http://${process.env.BACKEND_HOSTPORT}`
    : "http://127.0.0.1:8000")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
