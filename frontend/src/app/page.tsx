"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ChatCircleDots,
  Robot,
  ShoppingCart,
  ChartBar,
  Globe,
  Lightning,
  Shield,
  Users,
  ArrowRight,
  Check,
  Star,
  MessengerLogo,
  WhatsappLogo,
  Brain,
  Sparkle,
  Headset,
  TrendUp,
  CaretDown,
} from "@phosphor-icons/react";
import { useState } from "react";

// ============================================
// ANIMATIONS
// ============================================
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

// ============================================
// LANDING PAGE
// ============================================
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      <Navbar />
      <HeroSection />
      <LogoStrip />
      <FeaturesSection />
      <HowItWorksSection />
      <LiveDemoSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// ============================================
// NAVBAR
// ============================================
function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
    >
      <div className="absolute inset-0 bg-[#0A0F1C]/80 backdrop-blur-xl" />
      <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Robot size={20} weight="fill" className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">
            Smart<span className="text-indigo-400">Rep</span> AI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ============================================
// HERO
// ============================================
function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
              <Sparkle size={14} weight="fill" className="text-indigo-400" />
              <span className="text-xs text-indigo-300 font-medium">
                AI-Powered Business Automation
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-white">Your AI-Powered</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Business Representative
              </span>
            </h1>

            <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
              Automate your Facebook & WhatsApp customer conversations. SmartRep AI
              handles sales, support, and orders in{" "}
              <span className="text-white font-medium">Bangla, Banglish, English & Hindi</span>{" "}
              — just like your best sales person.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-xl shadow-indigo-500/25"
              >
                Start Free Trial
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
              >
                Watch Demo
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              {[
                { value: "500+", label: "Businesses" },
                { value: "2M+", label: "Messages Handled" },
                { value: "4.9", label: "Rating", icon: Star },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white flex items-center gap-1">
                    {stat.value}
                    {stat.icon && <Star size={16} weight="fill" className="text-amber-400" />}
                  </div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Chat header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Robot size={20} weight="fill" className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">SmartRep AI</div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    Online
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="space-y-3">
                <ChatBubble
                  side="right"
                  message="bhai ghori ache? sundor ekta lagbe"
                  delay={0.5}
                />
                <ChatBubble
                  side="left"
                  message="Vai, assalamu alaikum! 😊 Amader kache onek sundor ghori ache! Ki type er lagbe? Formal na casual?"
                  delay={1.2}
                  isAI
                />
                <ChatBubble
                  side="right"
                  message="formal.. budget 2000 er moddhe"
                  delay={2.0}
                />
                <ChatBubble
                  side="left"
                  message="Vai, apnar jonno 2ta best option ache 🔥\n\n1. Classic Gold - ৳1,800 (Best Seller!)\n2. Premium Silver - ৳1,950\n\nDuitai waterproof + 1 year warranty. Konta dekhben? 😊"
                  delay={2.8}
                  isAI
                />
              </div>

              {/* Typing indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
                className="mt-3 flex items-center gap-2 text-xs text-slate-500"
              >
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                SmartRep AI is typing...
              </motion.div>
            </div>

            {/* Floating badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="absolute -top-4 -right-4 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
            >
              <span className="text-xs text-emerald-400 font-medium">🤖 AI Powered</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute -bottom-3 -left-4 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-full"
            >
              <span className="text-xs text-cyan-400 font-medium">🌐 Multilingual</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({
  side,
  message,
  delay,
  isAI,
}: {
  side: "left" | "right";
  message: string;
  delay: number;
  isAI?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm whitespace-pre-line ${
          side === "right"
            ? "bg-indigo-500/20 border border-indigo-500/30 rounded-2xl rounded-br-sm text-indigo-100"
            : "bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm text-slate-200"
        }`}
      >
        {message}
      </div>
    </motion.div>
  );
}

// ============================================
// LOGO STRIP
// ============================================
function LogoStrip() {
  return (
    <section className="py-12 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm text-slate-500 mb-8">
          Trusted by 500+ F-Commerce businesses across Bangladesh
        </p>
        <div className="flex items-center justify-center gap-12 opacity-40">
          {["Fashion House", "Watch Zone", "Gadget BD", "Beauty Shop", "Shoe Store"].map((name) => (
            <div key={name} className="text-lg font-bold text-slate-400">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FEATURES
// ============================================
function FeaturesSection() {
  const features = [
    {
      icon: Robot,
      title: "AI Auto-Reply",
      description: "Instantly respond to customer messages 24/7 with intelligent, context-aware replies.",
      color: "indigo",
    },
    {
      icon: Globe,
      title: "Multilingual Support",
      description: "Responds in Bangla, Banglish, English, Hindi — matching your customer's language.",
      color: "cyan",
    },
    {
      icon: ShoppingCart,
      title: "Smart Order Taking",
      description: "AI extracts orders from conversations automatically — product, quantity, address.",
      color: "purple",
    },
    {
      icon: TrendUp,
      title: "Smart Upselling",
      description: "Suggests related products and creates urgency like your best sales person.",
      color: "amber",
    },
    {
      icon: Headset,
      title: "Sentiment Alerts",
      description: "Detects angry customers instantly and alerts you for human takeover.",
      color: "rose",
    },
    {
      icon: ChartBar,
      title: "Real-time Analytics",
      description: "Track messages, conversion rates, top products, and customer satisfaction live.",
      color: "emerald",
    },
    {
      icon: ChatCircleDots,
      title: "Abandoned Chat Recovery",
      description: "Automatically follow up with customers who left without purchasing.",
      color: "orange",
    },
    {
      icon: Brain,
      title: "Knowledge Base AI",
      description: "Upload products & FAQs. AI learns everything about your business instantly.",
      color: "pink",
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400",
    pink: "from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400",
  };

  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Automate Sales</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            SmartRep AI combines cutting-edge AI with deep understanding of
            F-Commerce to give you superpowers.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="group relative p-6 rounded-xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.06] hover:border-white/10 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[feature.color]} border flex items-center justify-center mb-4`}
                >
                  <Icon size={24} weight="duotone" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// HOW IT WORKS
// ============================================
function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Connect Your Pages",
      description: "Link your Facebook Page or WhatsApp Business in just 2 clicks. We handle all the technical setup.",
      icon: MessengerLogo,
      color: "from-blue-500 to-indigo-600",
    },
    {
      step: "02",
      title: "Train Your AI",
      description: "Add your products, FAQs, and business info. AI builds a knowledge base in minutes.",
      icon: Brain,
      color: "from-purple-500 to-pink-600",
    },
    {
      step: "03",
      title: "Go Live & Sell",
      description: "Your AI representative starts handling messages instantly. Watch sales grow on autopilot.",
      icon: Lightning,
      color: "from-cyan-500 to-emerald-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.02] to-transparent" />
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Get Started in <span className="gradient-text">3 Simple Steps</span>
          </h2>
          <p className="text-lg text-slate-400">
            From signup to first AI response in under 10 minutes
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative text-center"
              >
                <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-xl`}>
                  <Icon size={36} weight="fill" className="text-white" />
                </div>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Step {step.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>

                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t border-dashed border-white/10" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================
// LIVE DEMO
// ============================================
function LiveDemoSection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden border border-white/10 p-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-cyan-500/10" />
          <div className="relative bg-[#0A0F1C] rounded-xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              See SmartRep AI in Action
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Try chatting with our demo bot. Ask about products in Bangla, Banglish,
              or English — and see how SmartRep handles it.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-xl shadow-indigo-500/25"
            >
              Try Free Demo
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// PRICING
// ============================================
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "14 days trial",
      features: [
        "100 messages/month",
        "1 Facebook Page",
        "Basic AI responses",
        "Knowledge base (10 items)",
        "Basic analytics",
      ],
      cta: "Start Free Trial",
      popular: false,
      gradient: "from-slate-500 to-slate-600",
    },
    {
      name: "Growth",
      price: "$14.99",
      period: "/month",
      features: [
        "2,000 messages/month",
        "3 Facebook Pages",
        "Advanced AI + Upselling",
        "Unlimited knowledge base",
        "Full analytics dashboard",
        "Abandoned chat recovery",
        "Customer segmentation",
        "Email support",
      ],
      cta: "Get Started",
      popular: false,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      name: "Professional",
      price: "$34.99",
      period: "/month",
      features: [
        "10,000 messages/month",
        "10 Facebook Pages",
        "Everything in Growth +",
        "Smart order taking",
        "AI campaign messages",
        "Product description AI",
        "Priority support",
        "Team members (3)",
      ],
      cta: "Get Started",
      popular: true,
      gradient: "from-indigo-500 to-purple-600",
    },
    {
      name: "Enterprise",
      price: "$119",
      period: "/month",
      features: [
        "50,000 messages/month",
        "Unlimited Pages",
        "Everything in Pro +",
        "WhatsApp integration",
        "Custom AI training",
        "Dedicated support",
        "Unlimited team members",
        "API access",
        "Custom integrations",
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="text-lg text-slate-400">
            Start free, upgrade as you grow. No hidden fees.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-6 ${
                plan.popular
                  ? "bg-gradient-to-b from-indigo-500/10 to-purple-500/5 border-2 border-indigo-500/30"
                  : "bg-white/[0.02] border border-white/[0.06]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-bold text-white rounded-full">
                  ⭐ Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check size={16} weight="bold" className="text-indigo-400 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-3 rounded-xl font-medium text-sm transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// TESTIMONIALS
// ============================================
function TestimonialsSection() {
  const testimonials = [
    {
      name: "Rahim Uddin",
      business: "Watch Zone BD",
      text: "SmartRep AI transformed my business! It handles 90% of my Facebook messages automatically. My sales went up 40% in the first month.",
      avatar: "R",
    },
    {
      name: "Fatema Akter",
      business: "Fashion Hub",
      text: "The Banglish support is amazing! My customers feel like they're talking to a real person. Best investment for my F-commerce business.",
      avatar: "F",
    },
    {
      name: "Karim Hassan",
      business: "Gadget BD",
      text: "I used to miss messages at night. Now SmartRep AI handles everything 24/7. The order extraction feature saves me hours every day.",
      avatar: "K",
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Loved by <span className="gradient-text">Business Owners</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={16} weight="fill" className="text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                &quot;{t.text}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.business}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ
// ============================================
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    {
      q: "How does SmartRep AI handle Bangla and Banglish?",
      a: "SmartRep AI uses advanced language detection to identify whether a customer is writing in Bangla (বাংলা), Banglish (Bengali in English letters), English, or Hindi. It then responds in the same language, matching the customer's style naturally.",
    },
    {
      q: "Do I need technical knowledge to set it up?",
      a: "Not at all! Just connect your Facebook Page, add your products, and SmartRep AI handles the rest. Our step-by-step wizard makes it super easy.",
    },
    {
      q: "Can I take over a conversation from AI?",
      a: "Yes! You can see all conversations in real-time. With one click, you can take over any chat, and return it to AI when done. You'll also get alerts when a customer seems upset.",
    },
    {
      q: "How accurate is the AI?",
      a: "SmartRep AI is powered by Google's latest Gemini AI model combined with your specific business knowledge base. It typically handles 85-95% of conversations without any human intervention.",
    },
    {
      q: "What happens if I exceed my message limit?",
      a: "You'll get a notification when you're near your limit. Extra messages are charged at $0.01 per message, or you can upgrade your plan anytime.",
    },
    {
      q: "Is my data secure?",
      a: "Absolutely. We use industry-standard encryption, secure servers, and never share your data with third parties. Your customer conversations are private and protected.",
    },
  ];

  return (
    <section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-medium text-white">{faq.q}</span>
                <CaretDown
                  size={18}
                  className={`text-slate-400 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-5 pb-5"
                >
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA
// ============================================
function CTASection() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 animated-gradient opacity-20" />
          <div className="absolute inset-0 bg-[#0A0F1C]/60 backdrop-blur-sm" />
          <div className="relative text-center py-16 px-6">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Automate Your Business?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-lg mx-auto">
              Join 500+ businesses already using SmartRep AI to sell more and work less.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0A0F1C] font-bold rounded-xl hover:bg-slate-100 transition-all shadow-xl"
            >
              Start Free Trial — No Credit Card
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Robot size={16} weight="fill" className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Smart<span className="text-indigo-400">Rep</span> AI
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              AI-Powered Business Representative for F-Commerce & E-Commerce.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2">
              {["Features", "Pricing", "Integrations", "API"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
            <ul className="space-y-2">
              {["About", "Blog", "Careers", "Contact"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-slate-600">
            © 2026 SmartRep AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
