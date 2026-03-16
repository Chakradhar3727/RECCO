import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@recco/db", "@recco/ui"],
    experimental: {
        instrumentationHook: true,
    },
    serverActions: {
        allowedOrigins: [
            "localhost:3000",
            "*.loca.lt",
            "*.pinggy.link",
            "*.pinggy.io",
            "*.serveo.net",
            "*.loclx.io",
            "*.untun.com",
        ],
    },
    webpack: (config) => {
        // Disable Webpack caching entirely to prevent ERR_MEMORY_ALLOCATION_FAILED 
        // crashes during local development hot reloads.
        config.cache = false;
        return config;
    },
};

export default withPWA(nextConfig);
