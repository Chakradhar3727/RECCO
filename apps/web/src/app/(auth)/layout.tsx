import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-recco-green-100 via-white to-recco-gray-50 flex flex-col">
            {/* Auth Header */}
            <header className="p-4 border-b bg-white/80 backdrop-blur-sm">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <Link
                        href="/"
                        className="p-2 rounded-lg hover:bg-recco-gray-50 transition-colors text-recco-navy-900/60"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <Image
                        src="/logo.png"
                        alt="RECCO"
                        width={120}
                        height={40}
                        className="h-10 w-auto"
                        priority
                    />
                </div>
            </header>

            {/* Auth Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">{children}</div>
            </main>

            {/* Auth Footer */}
            <footer className="p-4 text-center">
                <p className="text-recco-navy-900/30 text-xs">
                    &copy; 2026 RECCO EPR SaaS Platform
                </p>
            </footer>
        </div>
    );
}
