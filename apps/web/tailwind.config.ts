import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                recco: {
                    green: {
                        700: "#1B6B35", // Primary CTA, success
                        100: "#E8F5ED", // Backgrounds
                    },
                    teal: {
                        700: "#0E5A6E", // Secondary, transport
                    },
                    amber: {
                        700: "#B45309", // Warning (WCAG AA)
                    },
                    red: {
                        700: "#B91C1C", // Error, alerts
                    },
                    navy: {
                        900: "#1A2F4B", // Primary text, Admin sidebar
                    },
                    gray: {
                        50: "#F5F5F5", // Background, disabled
                    },
                },
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                mono: ["var(--font-roboto-mono)", "monospace"],
            },
        },
    },
    plugins: [],
};
export default config;
