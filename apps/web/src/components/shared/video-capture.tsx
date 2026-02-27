"use client";

import { useState, useRef, useCallback } from "react";
import { Video, Square, Loader2, Trash2 } from "lucide-react";

interface VideoCaptureProps {
    onCapture?: (blob: Blob) => void;
    maxDurationSec?: number;
}

export function VideoCapture({ onCapture, maxDurationSec = 60 }: VideoCaptureProps) {
    const [status, setStatus] = useState<"idle" | "recording" | "preview">("idle");
    const [elapsed, setElapsed] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                setStatus("preview");
                onCapture?.(blob);
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorder.start(1000);
            setStatus("recording");
            setElapsed(0);

            timerRef.current = setInterval(() => {
                setElapsed((prev) => {
                    if (prev + 1 >= maxDurationSec) {
                        mediaRecorderRef.current?.stop();
                        clearInterval(timerRef.current!);
                        return maxDurationSec;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch {
            alert("Camera access is required for video capture.");
        }
    }, [maxDurationSec, onCapture]);

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const reset = () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setStatus("idle");
        setElapsed(0);
    };

    return (
        <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                    ref={videoRef}
                    src={status === "preview" ? videoUrl || undefined : undefined}
                    controls={status === "preview"}
                    muted={status === "recording"}
                    playsInline
                    className="w-full h-full object-cover"
                />
                {status === "recording" && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-recco-red-700 text-white text-xs font-bold px-2 py-1 rounded-full">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        {elapsed}s / {maxDurationSec}s
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                {status === "idle" && (
                    <button type="button" onClick={startRecording} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-recco-red-700 text-white font-semibold hover:bg-recco-red-700/90 transition-colors">
                        <Video size={18} /> Start Recording
                    </button>
                )}
                {status === "recording" && (
                    <button type="button" onClick={stopRecording} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-recco-navy-900 text-white font-semibold hover:bg-recco-navy-900/90 transition-colors">
                        <Square size={18} /> Stop Recording
                    </button>
                )}
                {status === "preview" && (
                    <button type="button" onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-recco-red-700 text-recco-red-700 font-semibold hover:bg-recco-red-700/10 transition-colors">
                        <Trash2 size={18} /> Re-record
                    </button>
                )}
            </div>
        </div>
    );
}
