import Link from "next/link";
import { LucideIcon, ExternalLink } from "lucide-react";

interface PortalCardProps {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    color: string;
    link: string;
}

export function PortalCard({ name, description, icon: Icon, color, link }: PortalCardProps) {
    return (
        <Link
            href={link}
            className="group block p-6 rounded-2xl border-2 border-transparent hover:border-recco-green-700 transition-all bg-recco-gray-50 shadow-sm"
        >
            <div className="flex items-center gap-4 mb-4">
                <div className={`${color} p-4 rounded-2xl text-white shadow-lg`}>
                    <Icon size={28} />
                </div>
                <div className="flex-1">
                    <h4 className="text-xl font-bold text-recco-navy-900 group-hover:text-recco-green-700 transition-colors">
                        {name}
                    </h4>
                    <p className="text-xs font-bold text-recco-navy-900/40 uppercase tracking-widest mt-0.5">
                        Platform Role
                    </p>
                </div>
                <ExternalLink
                    size={20}
                    className="text-recco-navy-900/20 group-hover:text-recco-green-700 transition-colors"
                />
            </div>
            <p className="text-recco-navy-900/70 leading-relaxed text-sm">{description}</p>
        </Link>
    );
}
