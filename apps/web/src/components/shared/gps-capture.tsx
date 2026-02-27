"use client";

import { useState, useCallback } from "react";
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface GPSCaptureProps {
    onCapture?: (coords: { lat: number; lng: number; accuracy: number }) => void;
    required?: boolean;
}

export function GPSCapture({ onCapture, required = false }: GPSCaptureProps) {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
    const [error, setError] = useState("");

    const captureLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const captured = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                };
                setCoords(captured);
                setStatus("success");
                onCapture?.(captured);
            },
            (err) => {
                setError(err.message);
                setStatus("error");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [onCapture]);

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={captureLocation}
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-recco-green-700/30 hover:border-recco-green-700 transition-colors text-recco-navy-900 font-medium disabled:opacity-50"
            >
                {status === "loading" ? (
                    <Loader2 size={18} className="animate-spin text-recco-green-700" />
                ) : (
                    <MapPin size={18} className="text-recco-green-700" />
                )}
                {status === "loading" ? "Capturing GPS..." : status === "success" ? "Recapture Location" : "Capture GPS Location"}
                {required && <span className="text-recco-red-700">*</span>}
            </button>

            {status === "success" && coords && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-recco-green-100 text-sm">
                    <CheckCircle2 size={16} className="text-recco-green-700 shrink-0" />
                    <span className="text-recco-navy-900">
                        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)} (±{Math.round(coords.accuracy)}m)
                    </span>
                </div>
            )}

            {status === "error" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-recco-red-700/10 text-sm">
                    <AlertCircle size={16} className="text-recco-red-700 shrink-0" />
                    <span className="text-recco-red-700">{error}</span>
                </div>
            )}
        </div>
    );
}
