"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlowButton } from "@/components/ui/GlowButton";
import { Sparkles } from "lucide-react";

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                scrolled
                    ? "py-3 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
                    : "py-5 bg-transparent border-b border-transparent"
            )}
        >
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute inset-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                    </div>
                    <span className="text-xl font-bold">
                        <span className="text-slate-300">Nutri</span>
                        <span className="text-white">SKU</span>
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                    <Link
                        href="#features"
                        className="relative hover:text-white transition-colors group"
                    >
                        Why NutriSKU
                        <span className="absolute left-0 -bottom-1 w-0 h-px bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-300" />
                    </Link>
                    <Link
                        href="#how-it-works"
                        className="relative hover:text-white transition-colors group"
                    >
                        How it Works
                        <span className="absolute left-0 -bottom-1 w-0 h-px bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-300" />
                    </Link>
                    <Link
                        href="#pricing"
                        className="relative hover:text-white transition-colors group"
                    >
                        Pricing
                        <span className="absolute left-0 -bottom-1 w-0 h-px bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:w-full transition-all duration-300" />
                    </Link>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-slate-400 hover:text-white hidden md:block transition-colors"
                    >
                        Log in
                    </Link>
                    <GlowButton variant="green" size="sm">
                        Get Started
                    </GlowButton>
                </div>
            </div>
        </nav>
    );
}
