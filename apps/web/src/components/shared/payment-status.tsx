import { Clock, CheckCircle2, AlertCircle, Ban, Loader2 } from "lucide-react";

type PaymentState = "pending" | "held" | "released" | "failed" | "processing";

interface PaymentStatusProps {
    status: PaymentState;
    amount?: number;
    currency?: string;
}

const config: Record<PaymentState, { icon: React.ReactNode; label: string; classes: string }> = {
    pending: {
        icon: <Clock size={14} />,
        label: "Pending",
        classes: "bg-recco-amber-700/10 text-recco-amber-700 border-recco-amber-700/20",
    },
    held: {
        icon: <Loader2 size={14} className="animate-spin" />,
        label: "In Escrow",
        classes: "bg-recco-teal-700/10 text-recco-teal-700 border-recco-teal-700/20",
    },
    released: {
        icon: <CheckCircle2 size={14} />,
        label: "Released",
        classes: "bg-recco-green-100 text-recco-green-700 border-recco-green-700/20",
    },
    failed: {
        icon: <Ban size={14} />,
        label: "Failed",
        classes: "bg-recco-red-700/10 text-recco-red-700 border-recco-red-700/20",
    },
    processing: {
        icon: <Loader2 size={14} className="animate-spin" />,
        label: "Processing",
        classes: "bg-recco-navy-900/5 text-recco-navy-900 border-recco-navy-900/10",
    },
};

export function PaymentStatus({ status, amount, currency = "INR" }: PaymentStatusProps) {
    const c = config[status];

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.classes}`}>
            {c.icon}
            <span>{c.label}</span>
            {amount !== undefined && (
                <span className="opacity-70">
                    · ₹{amount.toLocaleString("en-IN")}
                </span>
            )}
        </div>
    );
}
