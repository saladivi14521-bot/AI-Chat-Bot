"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChatCircleDots,
  ShoppingCart,
  CurrencyDollar,
  Users,
  Robot,
  Spinner,
  ArrowRight,
} from "@phosphor-icons/react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await analyticsApi.getDashboard(30);
      setStats(res.data);
    } catch {
      // API might fail if no business yet
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size={32} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  const messageVolume = stats?.message_volume?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    count: d.count,
  })) || [];

  const sentimentData = stats?.sentiment_breakdown
    ? [
        { name: "Positive", value: stats.sentiment_breakdown.positive || 0, color: "#10B981" },
        { name: "Neutral", value: stats.sentiment_breakdown.neutral || 0, color: "#6366F1" },
        { name: "Negative", value: stats.sentiment_breakdown.negative || 0, color: "#F59E0B" },
        { name: "Angry", value: stats.sentiment_breakdown.angry || 0, color: "#EF4444" },
      ]
    : [];

  const languageData = stats?.language_breakdown
    ? Object.entries(stats.language_breakdown).map(([name, value], i) => ({
        name,
        value: value as number,
        color: ["#6366F1", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981"][i % 5],
      }))
    : [];

  const hourlyData = stats?.hourly_activity?.map((d: any) => ({
    hour: `${d.hour}:00`,
    count: d.count,
  })) || [];

  const hasData = stats && (stats.total_messages_today > 0 || stats.total_messages_month > 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">Welcome back! Here&apos;s what&apos;s happening with your business today.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Messages Today" value={stats?.total_messages_today ?? 0} icon={ChatCircleDots} color="indigo" delay={0} />
        <StatCard title="Active Conversations" value={stats?.active_conversations ?? 0} icon={Users} color="cyan" delay={0.1} />
        <StatCard title="Orders Today" value={stats?.total_orders_today ?? 0} icon={ShoppingCart} color="emerald" delay={0.2} />
        <StatCard title="Revenue Today" value={`৳${(stats?.revenue_today ?? 0).toLocaleString()}`} icon={CurrencyDollar} color="amber" delay={0.3} />
      </div>

      {!hasData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 text-center">
          <Robot size={48} weight="duotone" className="text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Welcome to SmartRep AI! 🚀</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Your AI assistant is ready. Start by adding products and knowledge base entries, then connect your Facebook page.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/dashboard/products" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors">
              Add Products <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/knowledge-base" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl border border-white/10 transition-colors">
              Add Knowledge Base <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/integrations" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl border border-white/10 transition-colors">
              Connect Facebook <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Messages This Month" value={stats?.total_messages_month ?? 0} />
        <MiniStat label="Conversations This Month" value={stats?.total_conversations_month ?? 0} />
        <MiniStat label="Orders This Month" value={stats?.total_orders_month ?? 0} />
        <MiniStat label="Revenue This Month" value={`৳${(stats?.revenue_month ?? 0).toLocaleString()}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-6">Message Volume (30 days)</h3>
          {messageVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={messageVolume}>
                <defs>
                  <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }} />
                <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorMsg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">No message data yet</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-6">Language Breakdown</h3>
          {languageData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={languageData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {languageData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {languageData.map((lang) => (
                  <div key={lang.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                      <span className="text-slate-300">{lang.name}</span>
                    </div>
                    <span className="text-slate-400 font-medium">{lang.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">No language data yet</div>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-6">Hourly Activity (Today)</h3>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="hour" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No activity data yet</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-6">Customer Sentiment</h3>
          {sentimentData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sentimentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#CBD5E1", fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {sentimentData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No sentiment data yet</div>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-4">AI Performance</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PerformanceBar label="AI Handled" value={stats?.ai_handled_percent ?? 0} color="bg-indigo-500" />
          <PerformanceBar label="Avg Response Time" value={Math.min(100, 100 - ((stats?.avg_response_time_ms ?? 0) / 50))} color="bg-cyan-500" subtitle={`${((stats?.avg_response_time_ms ?? 0) / 1000).toFixed(1)}s`} />
          <PerformanceBar label="Messages Today" value={Math.min(100, stats?.total_messages_today ?? 0)} color="bg-emerald-500" subtitle={`${stats?.total_messages_today ?? 0}`} />
          <PerformanceBar label="Active Chats" value={Math.min(100, (stats?.active_conversations ?? 0) * 10)} color="bg-amber-500" subtitle={`${stats?.active_conversations ?? 0}`} />
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, delay }: { title: string; value: string | number; icon: any; color: string; delay: number }) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} border flex items-center justify-center`}>
          <Icon size={20} weight="duotone" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{title}</div>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function PerformanceBar({ label, value, color, subtitle }: { label: string; value: number; color: string; subtitle?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-semibold text-white">{subtitle || `${Math.round(value)}%`}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 1, delay: 0.5 }} className={`h-full ${color} rounded-full`} />
      </div>
    </div>
  );
}
