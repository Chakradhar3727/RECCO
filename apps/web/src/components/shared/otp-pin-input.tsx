"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

/**
 * Shared OTP/PIN Input Component — Patch 7 (P7)
 * Used across ALL 5 portals for OTP verification and PIN entry.
 *
 * Requirements:
 *  - inputMode="numeric" → forces numeric keyboard on mobile
 *  - pattern="[0-9]*" → iOS numeric keyboard
 *  - type="text" → prevents browser spinners from type="number"
 *  - autoComplete="one-time-code" → enables OTP autofill from SMS/email
 *  - Auto-advance on digit entry
 *  - Backspace returns to previous input
 *  - Paste support for full code
 */

interface OtpPinInputProps {
    /** Number of digits: 4 for PIN or OTP, 6 for extended OTP */
    length: 4 | 6;
    /** Callback when all digits are entered */
    onComplete: (code: string) => void;
    /** Error message to display below the input */
    error?: string;
    /** Whether the input is disabled (e.g., during submission) */
    disabled?: boolean;
    /** Label for accessibility */
    label?: string;
    /** Whether to use autoComplete="one-time-code" (true for OTP, false for PIN) */
    isOtp?: boolean;
}

export function OtpPinInput({
    length,
    onComplete,
    error,
    disabled = false,
    label,
    isOtp = true,
}: OtpPinInputProps) {
    const [values, setValues] = useState<string[]>(Array(length).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Focus the first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const focusInput = useCallback((index: number) => {
        if (index >= 0 && index < length) {
            inputRefs.current[index]?.focus();
        }
    }, [length]);

    const handleChange = useCallback(
        (index: number, value: string) => {
            // Only allow single digits
            const digit = value.replace(/[^0-9]/g, "").slice(-1);
            if (!digit && value !== "") return;

            const newValues = [...values];
            newValues[index] = digit;
            setValues(newValues);

            // Auto-advance to next input
            if (digit && index < length - 1) {
                focusInput(index + 1);
            }

            // Check if all digits are filled
            const code = newValues.join("");
            if (code.length === length && !newValues.includes("")) {
                onComplete(code);
            }
        },
        [values, length, onComplete, focusInput]
    );

    const handleKeyDown = useCallback(
        (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Backspace") {
                e.preventDefault();
                const newValues = [...values];

                if (values[index]) {
                    // Clear current input
                    newValues[index] = "";
                    setValues(newValues);
                } else if (index > 0) {
                    // Move to previous input and clear it
                    newValues[index - 1] = "";
                    setValues(newValues);
                    focusInput(index - 1);
                }
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                focusInput(index - 1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                focusInput(index + 1);
            }
        },
        [values, focusInput]
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pastedData = e.clipboardData
                .getData("text/plain")
                .replace(/[^0-9]/g, "")
                .slice(0, length);

            if (pastedData.length === 0) return;

            const newValues = Array(length).fill("");
            for (let i = 0; i < pastedData.length; i++) {
                newValues[i] = pastedData[i];
            }
            setValues(newValues);

            // Focus the next empty or last input
            const nextIndex = Math.min(pastedData.length, length - 1);
            focusInput(nextIndex);

            // If full code pasted, trigger onComplete
            if (pastedData.length === length) {
                onComplete(pastedData);
            }
        },
        [length, onComplete, focusInput]
    );

    // Reset values externally (e.g., on error)
    const reset = useCallback(() => {
        setValues(Array(length).fill(""));
        focusInput(0);
    }, [length, focusInput]);

    return (
        <div className="flex flex-col items-center gap-3">
            {label && (
                <label className="text-sm font-medium text-recco-gray-700">
                    {label}
                </label>
            )}
            <div className="flex gap-2 sm:gap-3" role="group" aria-label={label || "Enter code"}>
                {Array.from({ length }, (_, index) => (
                    <input
                        key={index}
                        ref={(el) => {
                            inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={isOtp ? "one-time-code" : "off"}
                        maxLength={1}
                        value={values[index]}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        onFocus={(e) => e.target.select()}
                        disabled={disabled}
                        aria-label={`Digit ${index + 1}`}
                        className={`
                            ${length >= 8 ? "w-10 h-12 sm:w-11 sm:h-14" : "w-12 h-14 sm:w-14 sm:h-16"}
                            text-center text-xl sm:text-2xl font-semibold
                            border-2 rounded-xl
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-recco-green-500 focus:border-recco-green-600
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${error
                                ? "border-red-400 bg-red-50 text-red-700"
                                : "border-recco-gray-300 bg-white text-recco-gray-900 hover:border-recco-gray-400"
                            }
                        `}
                    />
                ))}
            </div>
            {error && (
                <p className="text-sm text-red-600 mt-1 text-center" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

export default OtpPinInput;
