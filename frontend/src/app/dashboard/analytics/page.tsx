"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChartBar, Spinner } from "@phosphor-icons/react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "@/lib/api";

const tooltipStyle = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#F8FAFC",
  fontSize: "12px",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => { loadStats(); }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getDashboard(period);
      setStats(res.data);
    } catch { }
    finally { setLoading(false); }
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
        name, value: value as number,
        color: ["#6366F1", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981"][i % 5],
      }))
    : [];

  const hourlyData = stats?.hourly_activity?.map((d: any) => ({
    hour: `${d.hour}:00`, count: d.count,
  })) || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">Performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${period === d ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "border-white/10 text-slate-400 hover:text-white"}`}>
              {d}D
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Messages Today" value={stats?.total_messages_today ?? 0} />
        <SummaryCard label="Conversations Today" value={stats?.total_conversations_today ?? 0} />
        <SummaryCard label="Orders Today" value={stats?.total_orders_today ?? 0} />
        <SummaryCard label="Revenue Today" value={`৳${(stats?.revenue_today ?? 0).toLocaleString()}`} />
        <SummaryCard label="Messages This Month" value={stats?.total_messages_month ?? 0} />
        <SummaryCard label="Conversations This Month" value={stats?.total_conversations_month ?? 0} />
        <SummaryCard label="AI Handle Rate" value={`${stats?.ai_handled_percent ?? 0}%`} />
        <SummaryCard label="Avg Response" value={`${((stats?.avg_response_time_ms ?? 0) / 1000).toFixed(1)}s`} />
      </div>

      {/* Message Volume */}
      <ChartCard title="Message Volume">
        {messageVolume.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={messageVolume}>
              <defs>
                <linearGradient id="cMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#cMsg)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Hourly Activity */}
        <ChartCard title="Hourly Activity (Today)">
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="hour" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Sentiment */}
        <ChartCard title="Sentiment Breakdown">
          {sentimentData.some(d => d.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {sentimentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                {sentimentData.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-400">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Language Breakdown */}
      {languageData.length > 0 && (
        <ChartCard title="Language Breakdown">
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={languageData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                  {languageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {languageData.map(l => (
                <div key={l.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-slate-300">{l.name}</span>
                  <span className="text-slate-500 ml-auto">{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
      <div className="text-center">
        <ChartBar size={32} weight="duotone" className="mx-auto mb-2 text-slate-600" />
        <p>No data available yet</p>
      </div>
    </div>
  );
}
