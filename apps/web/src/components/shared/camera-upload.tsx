"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";

interface CameraUploadProps {
    onUpload?: (file: File, preview: string) => void;
    maxSizeMB?: number;
    accept?: string;
    label?: string;
}

export function CameraUpload({
    onUpload,
    maxSizeMB = 5,
    accept = "image/*",
    label = "Upload Photo",
}: CameraUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        setError("");
        if (file.size > maxSizeMB * 1024 * 1024) {
            setError(`File must be under ${maxSizeMB}MB`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPreview(result);
            onUpload?.(file, result);
        };
        reader.readAsDataURL(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const clear = () => {
        setPreview(null);
        setError("");
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                capture="environment"
                onChange={handleChange}
                className="hidden"
                id="camera-upload"
            />

            {!preview ? (
                <label
                    htmlFor="camera-upload"
                    className="flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-recco-green-700/30 hover:border-recco-green-700 transition-colors cursor-pointer bg-recco-gray-50"
                >
                    <div className="flex gap-2">
                        <Camera size={24} className="text-recco-green-700" />
                        <Upload size={24} className="text-recco-navy-900/40" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-recco-navy-900">{label}</p>
                        <p className="text-xs text-recco-navy-900/40 mt-1">
                            Camera or file · Max {maxSizeMB}MB
                        </p>
                    </div>
                </label>
            ) : (
                <div className="relative rounded-xl overflow-hidden border border-recco-gray-50">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                    />
                    <button
                        type="button"
                        onClick={clear}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-recco-red-700 text-white shadow-lg hover:bg-recco-red-700/90 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {error && (
                <p className="text-sm text-recco-red-700 flex items-center gap-1">
                    <ImageIcon size={14} /> {error}
                </p>
            )}
        </div>
    );
}
