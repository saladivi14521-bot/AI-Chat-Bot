"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CurrencyDollar, ChartBar, Robot, Spinner, Lightning,
} from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { adminApi } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await adminApi.getDashboard();
      setStats(res.data);
    } catch { }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size={32} className="text-red-400 animate-spin" />
      </div>
    );
  }

  const userGrowth = stats?.user_growth_chart?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    count: d.count,
  })) || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">System overview and metrics</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStat label="Total Users" value={stats?.total_users ?? 0} icon={Users} color="text-blue-400 bg-blue-500/10" />
        <AdminStat label="Active Businesses" value={stats?.active_businesses ?? 0} icon={Lightning} color="text-emerald-400 bg-emerald-500/10" />
        <AdminStat label="MRR" value={`$${(stats?.mrr ?? 0).toLocaleString()}`} icon={CurrencyDollar} color="text-amber-400 bg-amber-500/10" />
        <AdminStat label="Active Bots" value={stats?.active_bots ?? 0} icon={Robot} color="text-indigo-400 bg-indigo-500/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Messages Today" value={stats?.total_messages_today ?? 0} />
        <MiniStat label="Messages This Month" value={stats?.total_messages_month ?? 0} />
        <MiniStat label="New Users Today" value={stats?.new_users_today ?? 0} />
        <MiniStat label="New Users This Month" value={stats?.new_users_month ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">User Growth (30 days)</h3>
          {userGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F8FAFC", fontSize: "12px" }} />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </motion.div>

        {/* Plan Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">Plan Distribution</h3>
          <div className="space-y-4">
            {stats?.plan_distribution ? Object.entries(stats.plan_distribution).map(([plan, count]) => (
              <div key={plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300 capitalize">{plan}</span>
                  <span className="text-white font-medium">{count as number}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, ((count as number) / Math.max(1, stats.total_users)) * 100)}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No subscription data</p>}
          </div>
        </motion.div>
      </div>

      {/* System Health */}
      {stats?.system_health && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">System Health</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.system_health).map(([service, status]) => (
              <div key={service} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
                <div className={`w-2.5 h-2.5 rounded-full ${status === "healthy" ? "bg-emerald-400" : "bg-red-400"}`} />
                <div>
                  <div className="text-sm text-white capitalize">{service}</div>
                  <div className={`text-xs ${status === "healthy" ? "text-emerald-400" : "text-red-400"}`}>{status as string}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AdminStat({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon size={20} weight="duotone" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
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
