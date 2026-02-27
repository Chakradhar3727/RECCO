"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Lock, Unlock, Copy, Check } from "lucide-react";
import { useState } from "react";

interface QRDisplayProps {
    data: string;
    locked?: boolean;
    size?: number;
    label?: string;
}

export function QRDisplay({ data, locked = false, size = 200, label }: QRDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (canvasRef.current && data) {
            QRCode.toCanvas(canvasRef.current, data, {
                width: size,
                margin: 2,
                color: { dark: "#1A2F4B", light: "#FFFFFF" },
            });
        }
    }, [data, size]);

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className={`relative p-4 rounded-2xl ${locked ? "bg-recco-gray-50" : "bg-white"} border shadow-sm`}>
                <canvas ref={canvasRef} className={locked ? "opacity-30 blur-sm" : ""} />
                {locked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-recco-red-700 text-white p-3 rounded-full shadow-lg">
                            <Lock size={24} />
                        </div>
                    </div>
                )}
            </div>

            {label && (
                <p className="text-sm text-recco-navy-900/60 font-medium">{label}</p>
            )}

            <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${locked
                        ? "bg-recco-red-700/10 text-recco-red-700"
                        : "bg-recco-green-100 text-recco-green-700"
                    }`}>
                    {locked ? <Lock size={12} /> : <Unlock size={12} />}
                    {locked ? "Locked" : "Active"}
                </div>
                {!locked && (
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-recco-gray-50 text-recco-navy-900/60 hover:text-recco-navy-900 transition-colors"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                )}
            </div>
        </div>
    );
}
