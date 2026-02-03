"use client";

import { motion, type Variants, type Transition } from "framer-motion";
import { BarChart3, Search, Zap, Code2, Globe, Sparkles, Brain, Target, Layers } from "lucide-react";

const transition: Transition = {
    duration: 0.5,
    ease: [0.22, 1, 0.36, 1] as const
};

const features = [
    {
        title: "Knowledge Graph Engine",
        description: "Transform unstructured product data into a semantic graph that LLMs can perfectly understand and cite.",
        icon: Brain,
        gradient: "from-cyan-500 to-blue-500",
        bgGradient: "from-cyan-500/20 to-blue-500/20",
        iconBg: "bg-cyan-500",
    },
    {
        title: "Multi-Model Optimization",
        description: "Tailored content strategies for DeepSeek (Technical), ChatGPT (Conversational), and Claude (Analytical).",
        icon: Layers,
        gradient: "from-yellow-500 to-orange-500",
        bgGradient: "from-yellow-500/20 to-orange-500/20",
        iconBg: "bg-yellow-500",
    },
    {
        title: "Real-time Verification",
        description: "Our agents continuously query AI models to verify your products are being actively recommended.",
        icon: Target,
        gradient: "from-emerald-500 to-green-400",
        bgGradient: "from-emerald-500/20 to-green-400/20",
        iconBg: "bg-emerald-500",
    },
    {
        title: "Insight Dashboard",
        description: "Track your 'Share of Voice' in AI answers. See exactly how you rank against competitors.",
        icon: BarChart3,
        gradient: "from-purple-500 to-violet-500",
        bgGradient: "from-purple-500/20 to-violet-500/20",
        iconBg: "bg-purple-500",
    },
    {
        title: "Global AI Reach",
        description: "Optimize for Western (OpenAI/Anthropic) and Chinese (DeepSeek/Qwen) AI ecosystems simultaneously.",
        icon: Globe,
        gradient: "from-cyan-500 to-teal-500",
        bgGradient: "from-cyan-500/20 to-teal-500/20",
        iconBg: "bg-cyan-500",
    },
    {
        title: "AI Content Generation",
        description: "Auto-generate SEO-optimized content that AI models love to cite and recommend to users.",
        icon: Sparkles,
        gradient: "from-pink-500 to-rose-500",
        bgGradient: "from-pink-500/20 to-rose-500/20",
        iconBg: "bg-pink-500",
    },
];

export function Features() {
    return (
        <section id="features" className="relative py-32 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#08080c] via-[#0c0c14] to-[#08080c]" />

            {/* Animated grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

            {/* Floating decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Large gradient orbs */}
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

                {/* Decorative hexagons */}
                <svg className="absolute top-20 right-20 w-24 h-24 opacity-10" viewBox="0 0 100 100">
                    <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="url(#hexGrad1)" strokeWidth="1" />
                    <defs>
                        <linearGradient id="hexGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00d4ff" />
                            <stop offset="100%" stopColor="#00ff88" />
                        </linearGradient>
                    </defs>
                </svg>

                <svg className="absolute bottom-32 left-16 w-16 h-16 opacity-10 animate-float" viewBox="0 0 100 100">
                    <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="url(#hexGrad2)" strokeWidth="2" />
                    <defs>
                        <linearGradient id="hexGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#00d4ff" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={transition}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm mb-6 backdrop-blur-sm">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span>Powerful Features</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
                        Everything for the{" "}
                        <span className="relative">
                            <span className="gradient-text-primary">GEO Era</span>
                            <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                                <path d="M2 6C50 2 100 2 198 6" stroke="url(#underlineGrad)" strokeWidth="3" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="underlineGrad" x1="0" y1="0" x2="200" y2="0">
                                        <stop stopColor="#00d4ff" />
                                        <stop offset="1" stopColor="#00ff88" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </span>
                    </h2>
                    <p className="text-lg md:text-xl text-slate-400">
                        Dominate the &quot;AI Shelf&quot; with tools built specifically for the age of AI-powered discovery.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ ...transition, delay: index * 0.1 }}
                            className="group relative"
                        >
                            {/* Animated border gradient */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-sm"
                                style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
                            </div>

                            {/* Card */}
                            <div className="relative h-full p-8 rounded-2xl bg-[#0c0c14] border border-white/[0.08] group-hover:border-white/20 transition-all duration-500 overflow-hidden">
                                {/* Hover glow effect */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${feature.bgGradient}`} />

                                {/* Animated corner accent */}
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />

                                {/* Icon with enhanced styling */}
                                <div className="relative mb-6">
                                    <div className={`absolute -inset-2 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-xl blur-xl`} />
                                    <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-[1px]`}>
                                        <div className="w-full h-full rounded-xl bg-[#0c0c14] group-hover:bg-transparent transition-colors duration-300 flex items-center justify-center">
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <h3 className="relative text-xl font-semibold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                                    {feature.title}
                                </h3>
                                <p className="relative text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                                    {feature.description}
                                </p>

                                {/* Bottom accent line */}
                                <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom decoration */}
                <div className="mt-20 flex justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={transition}
                        className="flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                    >
                        <span className="text-slate-500 text-sm">Trusted by leading brands</span>
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-[#0c0c14] flex items-center justify-center text-[10px] text-slate-400 font-medium"
                                >
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <span className="text-slate-400 text-sm font-medium">+200 more</span>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
