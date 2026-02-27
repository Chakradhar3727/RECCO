import { Scale, AlertTriangle, CheckCircle2 } from "lucide-react";

interface WeightDisputeIndicatorProps {
    inputWeight: number;
    outputWeight: number;
    thresholdPercent?: number;
    unit?: string;
}

export function WeightDisputeIndicator({
    inputWeight,
    outputWeight,
    thresholdPercent = 5,
    unit = "kg",
}: WeightDisputeIndicatorProps) {
    const variance = inputWeight > 0
        ? ((inputWeight - outputWeight) / inputWeight) * 100
        : 0;
    const absVariance = Math.abs(variance);
    const isDisputed = absVariance > thresholdPercent;
    const lossPercent = Math.max(0, variance);

    return (
        <div className={`p-3 rounded-xl border ${isDisputed
                ? "bg-recco-red-700/5 border-recco-red-700/20"
                : "bg-recco-green-100 border-recco-green-700/20"
            }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Scale size={16} className={isDisputed ? "text-recco-red-700" : "text-recco-green-700"} />
                    <span className="text-sm font-medium text-recco-navy-900">Weight Variance</span>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${isDisputed ? "text-recco-red-700" : "text-recco-green-700"
                    }`}>
                    {isDisputed ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    {isDisputed ? "Flagged" : "Normal"}
                </div>
            </div>

            {/* Bar */}
            <div className="relative h-3 rounded-full bg-recco-gray-50 overflow-hidden mb-2">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${isDisputed ? "bg-recco-red-700" : "bg-recco-green-700"
                        }`}
                    style={{ width: `${Math.min(100, (outputWeight / inputWeight) * 100)}%` }}
                />
                {/* Threshold marker */}
                <div
                    className="absolute inset-y-0 w-0.5 bg-recco-navy-900/30"
                    style={{ left: `${100 - thresholdPercent}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-xs text-recco-navy-900/60">
                <span>In: {inputWeight}{unit}</span>
                <span className={`font-bold ${isDisputed ? "text-recco-red-700" : "text-recco-green-700"}`}>
                    -{lossPercent.toFixed(1)}%
                </span>
                <span>Out: {outputWeight}{unit}</span>
            </div>
        </div>
    );
}
