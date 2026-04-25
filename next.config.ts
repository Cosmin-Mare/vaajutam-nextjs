import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const nextConfigDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Self-contained server + traced deps — avoids Azure/Oryx reinstalling a different `next` than `.next` was built with.
  output: "standalone",
  // Lock tracing to this app when a parent directory also has a lockfile (avoids mixed roots in CI/Azure).
  outputFileTracingRoot: path.join(nextConfigDir),
  async redirects() {
    return [{ source: "/sustinatori", destination: "/parteneri", permanent: true }];
  },
};

export default nextConfig;
