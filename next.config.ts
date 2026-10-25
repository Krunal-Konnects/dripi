import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / Node-only packages stay out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql", "pdf-parse", "mammoth"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
