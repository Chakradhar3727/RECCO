import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "RECCO | EPR SaaS Platform",
    description: "Technology as the supply chain. Trust without paperwork.",
    manifest: "/manifest.json",
    // P9: Prevent Android Chrome from auto-linking numeric sequences (OTPs, PINs)
    formatDetection: {
        telephone: false,
        email: false,
        address: false,
    },
};

export const viewport: Viewport = {
    themeColor: "#1B6B35",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // P9: Prevent zoom on Android Chrome input focus
    interactiveWidget: "resizes-content", // P9: Android Chrome virtual keyboard resizes content, not viewport
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}

