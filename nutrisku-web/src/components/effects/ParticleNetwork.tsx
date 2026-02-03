"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    color: string;
}

interface ParticleNetworkProps {
    className?: string;
    particleCount?: number;
    connectionDistance?: number;
    particleSpeed?: number;
}

const COLORS = [
    "rgba(0, 212, 255, 1)",   // Electric Blue
    "rgba(0, 255, 136, 1)",    // Energy Green
    "rgba(139, 92, 246, 1)",   // Nebula Purple
];

export function ParticleNetwork({
    className = "",
    particleCount = 80,
    connectionDistance = 150,
    particleSpeed = 0.5,
}: ParticleNetworkProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef<number>(0);

    const initParticles = useCallback((width: number, height: number) => {
        const particles: Particle[] = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * particleSpeed,
                vy: (Math.random() - 0.5) * particleSpeed,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.3,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            });
        }
        return particles;
    }, [particleCount, particleSpeed]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const handleResize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            particlesRef.current = initParticles(rect.width, rect.height);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseleave", handleMouseLeave);

        const animate = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            // Update and draw particles
            for (const particle of particles) {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Bounce off edges
                if (particle.x < 0 || particle.x > rect.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > rect.height) particle.vy *= -1;

                // Mouse interaction - repel particles
                const dx = particle.x - mouse.x;
                const dy = particle.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 100) {
                    const force = (100 - distance) / 100;
                    particle.vx += (dx / distance) * force * 0.5;
                    particle.vy += (dy / distance) * force * 0.5;
                }

                // Limit velocity
                const maxVel = 2;
                const vel = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
                if (vel > maxVel) {
                    particle.vx = (particle.vx / vel) * maxVel;
                    particle.vy = (particle.vy / vel) * maxVel;
                }

                // Apply friction
                particle.vx *= 0.99;
                particle.vy *= 0.99;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color.replace("1)", `${particle.alpha})`);
                ctx.fill();
            }

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        const opacity = (1 - distance / connectionDistance) * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);

                        // Create gradient for connection
                        const gradient = ctx.createLinearGradient(
                            particles[i].x, particles[i].y,
                            particles[j].x, particles[j].y
                        );
                        gradient.addColorStop(0, particles[i].color.replace("1)", `${opacity})`));
                        gradient.addColorStop(1, particles[j].color.replace("1)", `${opacity})`));

                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Draw connections to mouse
            for (const particle of particles) {
                const dx = particle.x - mouse.x;
                const dy = particle.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < connectionDistance * 1.5) {
                    const opacity = (1 - distance / (connectionDistance * 1.5)) * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", handleResize);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseleave", handleMouseLeave);
            cancelAnimationFrame(animationRef.current);
        };
    }, [initParticles, connectionDistance]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
            style={{ zIndex: 0 }}
        />
    );
}
