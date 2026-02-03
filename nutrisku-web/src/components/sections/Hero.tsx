"use client";

import { motion, type Variants, type Transition } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";
import { ParticleNetwork } from "@/components/effects/ParticleNetwork";
import { ArrowRight, Sparkles, Zap, TrendingUp, Bot } from "lucide-react";
import Image from "next/image";

const transition: Transition = {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1] as const
};

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition
    }
};

const stats = [
    { value: "1M+", label: "SKUs Optimized", icon: Zap },
    { value: "50x", label: "AI Visibility Boost", icon: TrendingUp },
    { value: "3", label: "Major AI Models", icon: Bot },
];

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Particle Network Background */}
            <div className="absolute inset-0 z-0">
                <ParticleNetwork particleCount={100} connectionDistance={120} />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
                {/* Top radial glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.15)_0%,transparent_70%)]" />
                {/* Right side purple glow */}
                <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)]" />
                {/* Left side green glow */}
                <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(0,255,136,0.08)_0%,transparent_70%)]" />
                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#08080c] to-transparent" />
            </div>

            {/* Floating 3D Elements - Pure CSS */}
            <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
                {/* Floating rings */}
                <div className="absolute top-[15%] right-[10%] w-32 h-32 border-2 border-cyan-500/20 rounded-full animate-float" style={{ animationDelay: '0s' }} />
                <div className="absolute top-[20%] right-[15%] w-20 h-20 border border-purple-500/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-[30%] left-[8%] w-24 h-24 border-2 border-emerald-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />

                {/* Glowing orbs */}
                <div className="absolute top-[25%] left-[15%] w-4 h-4 bg-cyan-400 rounded-full blur-sm animate-pulse" />
                <div className="absolute top-[40%] right-[20%] w-3 h-3 bg-emerald-400 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-[35%] right-[25%] w-5 h-5 bg-purple-400 rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Abstract geometric shapes */}
                <svg className="absolute top-[30%] left-[5%] w-16 h-16 opacity-20 animate-float" style={{ animationDelay: '0.5s' }} viewBox="0 0 100 100">
                    <polygon points="50,10 90,90 10,90" fill="none" stroke="url(#grad1)" strokeWidth="2" />
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d4ff" />
                            <stop offset="100%" stopColor="#00ff88" />
                        </linearGradient>
                    </defs>
                </svg>

                <svg className="absolute bottom-[25%] right-[8%] w-20 h-20 opacity-15 animate-float" style={{ animationDelay: '1.5s' }} viewBox="0 0 100 100">
                    <rect x="20" y="20" width="60" height="60" fill="none" stroke="url(#grad2)" strokeWidth="2" transform="rotate(45 50 50)" />
                    <defs>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#00d4ff" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center text-center max-w-5xl mx-auto"
                >
                    {/* Badge */}
                    <motion.div
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium mb-8 backdrop-blur-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span>Introducing GEO — The Future of E-commerce Visibility</span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        variants={itemVariants}
                        className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
                    >
                        <span className="text-white">Make AI Models</span>
                        <br />
                        <span className="relative">
                            <span className="gradient-text-hero animate-gradient-flow bg-[length:200%_auto]">
                                Choose Your Brand
                            </span>
                            {/* Underline glow effect */}
                            <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></span>
                        </span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        variants={itemVariants}
                        className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
                    >
                        Don&apos;t just rank on Google. Get <span className="text-cyan-400 font-medium">recommended</span> by
                        ChatGPT, DeepSeek, and Claude. NutriSKU optimizes your product data so AI agents
                        choose <em className="text-white font-medium not-italic">your</em> brand as the answer.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        variants={itemVariants}
                        className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full mb-16"
                    >
                        <GlowButton variant="green" size="lg" className="w-full sm:w-auto group">
                            Start Free Audit
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </GlowButton>
                        <GlowButton variant="blue" size="lg" className="w-full sm:w-auto">
                            Watch Demo
                        </GlowButton>
                    </motion.div>

                    {/* Stats with enhanced visuals */}
                    <motion.div
                        variants={itemVariants}
                        className="grid grid-cols-3 gap-8 md:gap-16"
                    >
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center group relative">
                                {/* Glow behind on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                                <div className="relative">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <stat.icon className="w-5 h-5 text-cyan-400 group-hover:text-emerald-400 transition-colors" />
                                        <span className="text-3xl md:text-4xl font-bold text-white group-hover:scale-105 transition-transform">{stat.value}</span>
                                    </div>
                                    <span className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{stat.label}</span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* AI Chat Demo Card - Enhanced */}
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="mt-20 relative w-full max-w-4xl mx-auto"
                >
                    {/* Animated glow behind card */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-emerald-500/30 blur-2xl rounded-3xl animate-pulse" />
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 rounded-2xl opacity-20" />

                    {/* Card */}
                    <div className="relative glass rounded-2xl p-6 md:p-8 border border-white/10 bg-[#0c0c14]/90">
                        {/* Card header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="text-xs text-slate-500 ml-2">AI Shopping Assistant</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs text-emerald-400">Live</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* User Message */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-purple-500/20">
                                    U
                                </div>
                                <div className="bg-white/5 rounded-2xl rounded-tl-none px-5 py-4 text-slate-300 max-w-[85%] border border-white/5">
                                    Recommend a durable, windproof jacket for city commuting under $100.
                                </div>
                            </div>

                            {/* AI Response */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0 ring-2 ring-cyan-500/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="space-y-4 max-w-[90%]">
                                    <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-2xl rounded-tl-none px-5 py-4">
                                        <p className="text-slate-300 mb-4">Based on your needs for durability and city commuting, I highly recommend:</p>

                                        {/* Recommended SKU Card - Enhanced */}
                                        <div className="relative group cursor-pointer">
                                            {/* Hover glow */}
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity blur" />

                                            <div className="relative flex gap-4 bg-gradient-to-r from-white/5 to-white/[0.02] p-4 rounded-xl border border-emerald-500/30 group-hover:border-emerald-500/50 transition-all">
                                                {/* Product Image Placeholder with 3D effect */}
                                                <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent" />
                                                    <svg className="w-10 h-10 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">UltraCommute Jacket</h4>
                                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-emerald-500/30 animate-pulse">
                                                            Best Value
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 line-clamp-2 mb-2">Reinforced seams, water-resistant DWR coating, perfect for urban riders. 30-day return.</p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-white">$89.00</span>
                                                        <span className="text-sm text-slate-500 line-through">$129.00</span>
                                                        <span className="text-xs text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">Save 31%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Annotation - Enhanced */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                            className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-3"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-lg"></div>
                                <div className="relative w-16 h-px bg-gradient-to-r from-emerald-500 to-transparent" />
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-1 bg-emerald-500/20 blur rounded-lg"></div>
                                <div className="relative px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-sm text-emerald-400 whitespace-nowrap font-medium">
                                    Your SKU → AI&apos;s #1 Pick
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
