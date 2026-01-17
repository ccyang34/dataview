import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@supabase/auth-helpers-nextjs"],
};

export default nextConfig;
