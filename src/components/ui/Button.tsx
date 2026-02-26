"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ButtonHTMLAttributes, forwardRef } from "react";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
        const baseStyles =
            "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

        const variants = {
            primary:
                "bg-recco-green-700 text-white hover:bg-recco-green-700/90 focus:ring-recco-green-700",
            secondary:
                "bg-recco-teal-700 text-white hover:bg-recco-teal-700/90 focus:ring-recco-teal-700",
            outline:
                "border-2 border-recco-green-700 text-recco-green-700 hover:bg-recco-green-100 focus:ring-recco-green-700",
            ghost:
                "text-recco-navy-900 hover:bg-recco-gray-50 focus:ring-recco-navy-900",
            danger:
                "bg-recco-red-700 text-white hover:bg-recco-red-700/90 focus:ring-recco-red-700",
        };

        const sizes = {
            sm: "text-sm px-3 py-1.5",
            md: "text-sm px-4 py-2.5",
            lg: "text-base px-6 py-3",
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
