"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "blue" | "green" | "purple";
    size?: "default" | "lg" | "sm";
    children: React.ReactNode;
}

export function GlowButton({
    variant = "green",
    size = "default",
    className,
    children,
    ...props
}: GlowButtonProps) {
    const variantStyles = {
        blue: {
            bg: "bg-gradient-to-r from-cyan-500 to-blue-500",
            glow: "shadow-[0_0_20px_rgba(0,212,255,0.4),0_0_40px_rgba(0,212,255,0.2)]",
            hoverGlow: "hover:shadow-[0_0_30px_rgba(0,212,255,0.6),0_0_60px_rgba(0,212,255,0.3)]",
            ring: "focus:ring-cyan-500/50",
        },
        green: {
            bg: "bg-gradient-to-r from-emerald-500 to-green-400",
            glow: "shadow-[0_0_20px_rgba(0,255,136,0.4),0_0_40px_rgba(0,255,136,0.2)]",
            hoverGlow: "hover:shadow-[0_0_30px_rgba(0,255,136,0.6),0_0_60px_rgba(0,255,136,0.3)]",
            ring: "focus:ring-emerald-500/50",
        },
        purple: {
            bg: "bg-gradient-to-r from-violet-500 to-purple-500",
            glow: "shadow-[0_0_20px_rgba(139,92,246,0.4),0_0_40px_rgba(139,92,246,0.2)]",
            hoverGlow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.6),0_0_60px_rgba(139,92,246,0.3)]",
            ring: "focus:ring-violet-500/50",
        },
    };

    const sizeStyles = {
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-6 text-base",
        lg: "h-14 px-8 text-lg",
    };

    const styles = variantStyles[variant];

    return (
        <button
            className={cn(
                // Base
                "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white",
                "transition-all duration-300 ease-out",
                // Size
                sizeStyles[size],
                // Variant colors
                styles.bg,
                styles.glow,
                styles.hoverGlow,
                // Hover scale
                "hover:scale-105 active:scale-100",
                // Focus
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#08080c]",
                styles.ring,
                // Disabled
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                className
            )}
            {...props}
        >
            {/* Shimmer effect */}
            <span className="absolute inset-0 rounded-full overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </span>

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </button>
    );
}
