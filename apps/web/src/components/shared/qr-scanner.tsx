"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { ScanLine, Camera, XCircle, CheckCircle2 } from "lucide-react";

interface QRScannerProps {
    onScan?: (data: string) => void;
    onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const animFrameRef = useRef<number>(0);

    const startScanning = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setScanning(true);
                setResult(null);
                tick();
            }
        } catch {
            const msg = "Camera access required for QR scanning";
            onError?.(msg);
        }
    }, [onError]);

    const tick = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    setResult(code.data);
                    onScan?.(code.data);
                    stopScanning();
                    return;
                }
            }
        }
        animFrameRef.current = requestAnimationFrame(tick);
    }, [onScan]);

    const stopScanning = () => {
        setScanning(false);
        cancelAnimationFrame(animFrameRef.current);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
    };

    useEffect(() => () => stopScanning(), []);

    return (
        <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-recco-green-700 rounded-2xl animate-pulse" />
                    </div>
                )}
                {!scanning && !result && (
                    <div className="absolute inset-0 flex items-center justify-center bg-recco-navy-900/80">
                        <ScanLine size={48} className="text-white/50" />
                    </div>
                )}
            </div>

            {result ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-recco-green-100 border border-recco-green-700">
                    <CheckCircle2 size={18} className="text-recco-green-700 shrink-0" />
                    <p className="text-sm text-recco-navy-900 font-mono truncate">{result}</p>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={scanning ? stopScanning : startScanning}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-colors ${scanning
                            ? "bg-recco-red-700 text-white hover:bg-recco-red-700/90"
                            : "bg-recco-green-700 text-white hover:bg-recco-green-700/90"
                        }`}
                >
                    {scanning ? <XCircle size={18} /> : <Camera size={18} />}
                    {scanning ? "Stop Scanning" : "Scan QR Code"}
                </button>
            )}
        </div>
    );
}
