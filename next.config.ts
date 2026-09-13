import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const nextConfigDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Lock tracing to this app when a parent directory also has a lockfile.
  outputFileTracingRoot: path.join(nextConfigDir),
  transpilePackages: ["heic-to"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  async redirects() {
    return [
      { source: "/sustinatori", destination: "/parteneri", permanent: true },
      {
        source: "/admin/:path*",
        destination: "https://va-ajutam-din-dej-admin.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
