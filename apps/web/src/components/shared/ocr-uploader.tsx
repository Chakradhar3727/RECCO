"use client";

import { useState, useRef } from "react";
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface OCRResult {
    text: string;
    confidence?: number;
}

interface OCRUploaderProps {
    onResult?: (result: OCRResult) => void;
    label?: string;
}

export function OCRUploader({ onResult, label = "Upload for OCR" }: OCRUploaderProps) {
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<OCRResult | null>(null);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            setError("File must be under 10MB");
            setStatus("error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setStatus("uploading");
        setError("");

        // TODO: Replace with actual OCR.space API call
        setTimeout(() => {
            const mockResult: OCRResult = {
                text: "OCR processing not yet configured. Connect OCR_SPACE_API_KEY in Phase 1.",
                confidence: 0,
            };
            setResult(mockResult);
            setStatus("success");
            onResult?.(mockResult);
        }, 2000);
    };

    const reset = () => {
        setStatus("idle");
        setPreview(null);
        setResult(null);
        setError("");
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
                id="ocr-upload"
            />

            {status === "idle" ? (
                <label
                    htmlFor="ocr-upload"
                    className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-recco-teal-700/30 hover:border-recco-teal-700 transition-colors cursor-pointer bg-recco-gray-50"
                >
                    <FileText size={28} className="text-recco-teal-700" />
                    <div className="text-center">
                        <p className="font-medium text-recco-navy-900">{label}</p>
                        <p className="text-xs text-recco-navy-900/40 mt-1">
                            Upload a photo of the weight scale reading
                        </p>
                    </div>
                </label>
            ) : (
                <div className="space-y-2">
                    {preview && (
                        <div className="relative rounded-xl overflow-hidden">
                            <img src={preview} alt="OCR input" className="w-full h-32 object-cover" />
                            <button onClick={reset} className="absolute top-2 right-2 p-1.5 rounded-full bg-recco-navy-900/80 text-white">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {status === "uploading" && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-recco-teal-700/10">
                            <Loader2 size={16} className="animate-spin text-recco-teal-700" />
                            <span className="text-sm text-recco-teal-700 font-medium">Processing OCR...</span>
                        </div>
                    )}

                    {status === "success" && result && (
                        <div className="p-3 rounded-xl bg-recco-green-100 border border-recco-green-700">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-recco-green-700 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-recco-navy-900">OCR Result</p>
                                    <p className="text-sm text-recco-navy-900/70 font-mono mt-1">{result.text}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-recco-red-700/10">
                            <AlertCircle size={16} className="text-recco-red-700" />
                            <span className="text-sm text-recco-red-700">{error}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
