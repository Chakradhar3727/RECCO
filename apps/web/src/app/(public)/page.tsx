import Link from "next/link";
import Image from "next/image";
import {
    ShieldCheck,
    Truck,
    Recycle,
    Factory,
    Briefcase,
    ExternalLink
} from "lucide-react";

const portals = [
    {
        id: "admin",
        name: "RECCO Admin",
        description: "Master Control - Platform governance & fraud monitor",
        icon: ShieldCheck,
        color: "bg-recco-navy-900",
        link: "/auth/admin/login",
    },
    {
        id: "aggregator",
        name: "Aggregator",
        description: "Waste Collector - Track collections & create batches",
        icon: Truck,
        color: "bg-recco-green-700",
        link: "/auth/aggregator/login",
    },
    {
        id: "recycler",
        name: "Recycler",
        description: "Processing Facility - Manage intake & issue certificates",
        icon: Recycle,
        color: "bg-recco-teal-700",
        link: "/auth/recycler/login",
    },
    {
        id: "pibo",
        name: "PIBO",
        description: "Producer/Importer/Brand Owner - Compliance & Marketplace",
        icon: Factory,
        color: "bg-recco-amber-700",
        link: "/auth/pibo/login",
    },
    {
        id: "pro",
        name: "PRO",
        description: "Compliance Manager - Pooled client management",
        icon: Briefcase,
        color: "bg-purple-700",
        link: "/auth/pro/login",
    },
];

export default function Home() {
    return (
        <main className="min-h-screen bg-white">
            {/* Header */}
            <header className="p-6 border-b">
                <div className="max-w-7xl mx-auto flex flex-col items-start gap-0">
                    <Image
                        src="/logo.png"
                        alt="RECCO"
                        width={400}
                        height={128}
                        className="h-32 w-auto"
                        priority
                    />
                    <p className="-mt-4 text-recco-navy-900 font-medium">Turning Trash into Treasure</p>
                </div>
            </header>

            {/* Hero / Intro */}
            <section className="px-6 py-12 max-w-7xl mx-auto">
                <div className="bg-recco-green-100 p-6 rounded-xl border border-recco-green-700 mb-12">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-recco-green-700 rounded-full text-white">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="text-recco-navy-900 font-bold text-lg">Transport carrier?</h2>
                            <p className="text-recco-navy-900/80 text-sm">
                                Your QR link was sent by your collection partner — no login needed. Simply scan to start custodial verification.
                            </p>
                        </div>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-recco-navy-900 mb-8">Select Your Portal</h3>

                {/* Portal Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portals.map((portal) => (
                        <Link
                            key={portal.id}
                            href={portal.link}
                            className="group block p-6 rounded-2xl border-2 border-transparent hover:border-recco-green-700 transition-all bg-recco-gray-50 shadow-sm"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`${portal.color} p-4 rounded-2xl text-white shadow-lg`}>
                                    <portal.icon size={28} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-bold text-recco-navy-900 group-hover:text-recco-green-700 transition-colors">
                                        {portal.name}
                                    </h4>
                                    <p className="text-xs font-bold text-recco-navy-900/40 uppercase tracking-widest mt-0.5">
                                        Platform Role
                                    </p>
                                </div>
                                <ExternalLink size={20} className="text-recco-navy-900/20 group-hover:text-recco-green-700 transition-colors" />
                            </div>
                            <p className="text-recco-navy-900/70 leading-relaxed text-sm">
                                {portal.description}
                            </p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto p-12 border-t bg-recco-gray-50">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-recco-navy-900/40 text-sm font-medium">
                        &copy; 2026 RECCO EPR SaaS Platform. Built for India's Circular Economy.
                    </p>
                </div>
            </footer>
        </main>
    );
}
