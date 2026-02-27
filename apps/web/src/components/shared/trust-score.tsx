import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface TrustScoreProps {
    score: number;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
}

export function TrustScore({ score, size = "md", showLabel = true }: TrustScoreProps) {
    const clampedScore = Math.max(0, Math.min(100, score));

    const getColor = () => {
        if (clampedScore >= 80) return { bg: "bg-recco-green-100", text: "text-recco-green-700", border: "border-recco-green-700" };
        if (clampedScore >= 50) return { bg: "bg-recco-amber-700/10", text: "text-recco-amber-700", border: "border-recco-amber-700" };
        return { bg: "bg-recco-red-700/10", text: "text-recco-red-700", border: "border-recco-red-700" };
    };

    const getIcon = () => {
        if (clampedScore >= 80) return <ShieldCheck size={iconSize} />;
        if (clampedScore >= 50) return <Shield size={iconSize} />;
        return <ShieldAlert size={iconSize} />;
    };

    const getLabel = () => {
        if (clampedScore >= 80) return "Trusted";
        if (clampedScore >= 50) return "Moderate";
        return "Low Trust";
    };

    const sizeClasses = {
        sm: "px-2 py-0.5 text-xs gap-1",
        md: "px-3 py-1 text-sm gap-1.5",
        lg: "px-4 py-2 text-base gap-2",
    };

    const iconSize = size === "sm" ? 12 : size === "md" ? 16 : 20;

    const colors = getColor();

    return (
        <div
            className={`inline-flex items-center rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
        >
            {getIcon()}
            <span>{clampedScore}</span>
            {showLabel && <span className="font-medium opacity-80">· {getLabel()}</span>}
        </div>
    );
}
