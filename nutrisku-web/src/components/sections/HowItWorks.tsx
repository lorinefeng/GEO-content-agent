"use client";

import { motion, type Transition } from "framer-motion";
import { Database, Sparkles, Globe, CheckCircle, ArrowDown } from "lucide-react";

const transition: Transition = {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1] as const
};

const steps = [
    {
        number: "01",
        title: "Connect Your Product Data",
        description: "Integrate with your e-commerce platform. We support Shopify, WooCommerce, Magento, and custom APIs. Your SKU data flows seamlessly into our system.",
        icon: Database,
        gradient: "from-cyan-500 to-blue-500",
        color: "cyan",
    },
    {
        number: "02",
        title: "AI Content Generation",
        description: "Our GEO engine analyzes your products and generates optimized content using dual strategies: Technical Reviews and User-Persona Matching.",
        icon: Sparkles,
        gradient: "from-purple-500 to-pink-500",
        color: "purple",
    },
    {
        number: "03",
        title: "Multi-Platform Publishing",
        description: "Content is automatically adapted and published across platforms where AI models source their recommendations: Reddit, Quora, tech blogs, and more.",
        icon: Globe,
        gradient: "from-emerald-500 to-teal-500",
        color: "emerald",
    },
    {
        number: "04",
        title: "AI Visibility Verification",
        description: "Our verification agents query ChatGPT, DeepSeek, and Claude to confirm your products are now being recommended. Track your rise in real-time.",
        icon: CheckCircle,
        gradient: "from-yellow-500 to-orange-500",
        color: "yellow",
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="relative py-32 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[#06060a]" />

            {/* Animated gradient mesh */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[128px]" />
            </div>

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100px_100px]" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={transition}
                    className="text-center max-w-3xl mx-auto mb-24"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm mb-6 backdrop-blur-sm">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <span>Simple 4-Step Process</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
                        How{" "}
                        <span className="relative inline-block">
                            <span className="gradient-text-accent">NutriSKU</span>
                            {/* Animated underline */}
                            <motion.span
                                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full"
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                            />
                        </span>{" "}
                        Works
                    </h2>
                    <p className="text-lg md:text-xl text-slate-400">
                        From product data to AI recommendations in days, not months.
                    </p>
                </motion.div>

                {/* Steps - Enhanced Timeline */}
                <div className="max-w-5xl mx-auto relative">
                    {/* Central timeline line - Desktop */}
                    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px">
                        <div className="h-full bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-yellow-500/50" />
                        {/* Animated pulse dot */}
                        <motion.div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-500"
                            animate={{ y: ['0%', '100%'], opacity: [1, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        />
                    </div>

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ ...transition, delay: index * 0.15 }}
                            className={`relative mb-16 last:mb-0 lg:flex lg:items-center ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                                }`}
                        >
                            {/* Content Card */}
                            <div className={`lg:w-[calc(50%-40px)] ${index % 2 === 0 ? 'lg:pr-8 lg:text-right' : 'lg:pl-8 lg:text-left'}`}>
                                <div className="group relative p-6 md:p-8 rounded-2xl bg-[#0a0a10] border border-white/[0.08] hover:border-white/20 transition-all duration-500">
                                    {/* Hover glow */}
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                                    {/* Step number badge */}
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${step.gradient} bg-opacity-10 border border-white/10 text-xs font-bold text-white mb-4`}>
                                        <span>STEP {step.number}</span>
                                    </div>

                                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                                        {step.title}
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                                        {step.description}
                                    </p>
                                </div>
                            </div>

                            {/* Center Icon - Desktop */}
                            <div className="hidden lg:flex items-center justify-center w-20 shrink-0">
                                <div className="relative">
                                    {/* Outer glow ring */}
                                    <div className={`absolute -inset-4 rounded-full bg-gradient-to-br ${step.gradient} opacity-20 blur-lg`} />
                                    {/* Icon container */}
                                    <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${step.gradient} p-[2px]`}>
                                        <div className="w-full h-full rounded-full bg-[#0a0a10] flex items-center justify-center">
                                            <step.icon className="w-7 h-7 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Icon */}
                            <div className="lg:hidden flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} p-[1px]`}>
                                    <div className="w-full h-full rounded-xl bg-[#0a0a10] flex items-center justify-center">
                                        <step.icon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <span className={`text-sm font-bold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                                    STEP {step.number}
                                </span>
                            </div>

                            {/* Spacer for alternating layout */}
                            <div className="hidden lg:block lg:w-[calc(50%-40px)]" />
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA - Enhanced */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...transition, delay: 0.4 }}
                    className="text-center mt-20"
                >
                    <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.08] backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-slate-400 text-sm">Average setup time: <span className="text-white font-medium">15 minutes</span></span>
                        </div>
                        <p className="text-slate-500">Ready to make AI models love your products?</p>
                        <a
                            href="#"
                            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-medium hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-all duration-300"
                        >
                            Schedule a Demo
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
