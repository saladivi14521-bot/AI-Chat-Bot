"use client";

import { motion } from "framer-motion";
import {
  Database, Cpu, HardDrive, Clock, CheckCircle, XCircle,
  ArrowClockwise, Lightning, Globe, Gauge
} from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AdminSystemPage() {
  const services = [
    { name: "FastAPI Server", status: "running", uptime: "14d 6h 32m", cpu: "12%", memory: "256MB", port: 8080 },
    { name: "PostgreSQL 16", status: "running", uptime: "14d 6h 30m", cpu: "5%", memory: "512MB", port: 5432 },
    { name: "Redis 7", status: "running", uptime: "14d 6h 30m", cpu: "2%", memory: "64MB", port: 6379 },
    { name: "ChromaDB", status: "running", uptime: "14d 6h 28m", cpu: "8%", memory: "384MB", port: 8000 },
  ];

  const apiMetrics = [
    { endpoint: "/api/v1/webhook/facebook", avgLatency: "45ms", calls24h: 12450, errors: 3 },
    { endpoint: "/api/v1/conversations", avgLatency: "32ms", calls24h: 3200, errors: 0 },
    { endpoint: "/api/v1/auth/login", avgLatency: "120ms", calls24h: 450, errors: 12 },
    { endpoint: "/api/v1/products", avgLatency: "28ms", calls24h: 890, errors: 0 },
    { endpoint: "/api/v1/analytics/dashboard", avgLatency: "180ms", calls24h: 320, errors: 1 },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">System Health</h2>
        <p className="text-sm text-slate-400 mt-1">Monitor infrastructure and services</p>
      </motion.div>

      {/* Service Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service, i) => (
          <motion.div key={service.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <Database size={20} weight="duotone" className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{service.name}</h3>
                  <span className="text-[10px] text-slate-500">Port {service.port}</span>
                </div>
              </div>
              <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${service.status === "running" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                <CheckCircle size={10} weight="fill" /> {service.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1"><Clock size={10} /> Uptime</div>
                <div className="text-xs text-white font-medium">{service.uptime}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1"><Cpu size={10} /> CPU</div>
                <div className="text-xs text-white font-medium">{service.cpu}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1"><HardDrive size={10} /> Memory</div>
                <div className="text-xs text-white font-medium">{service.memory}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* API Metrics Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Globe size={16} weight="duotone" className="text-cyan-400" /> API Endpoint Metrics (24h)</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Endpoint", "Avg Latency", "Calls (24h)", "Errors", "Status"].map(h => (
                <th key={h} className="text-left text-[11px] text-slate-500 font-medium uppercase tracking-wider px-4 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apiMetrics.map(metric => (
              <tr key={metric.endpoint} className="border-b border-white/[0.03]">
                <td className="px-4 py-3"><code className="text-xs text-cyan-400 font-mono">{metric.endpoint}</code></td>
                <td className="px-4 py-3"><span className="text-xs text-white">{metric.avgLatency}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-white">{metric.calls24h.toLocaleString()}</span></td>
                <td className="px-4 py-3"><span className={`text-xs font-medium ${metric.errors > 0 ? "text-red-400" : "text-emerald-400"}`}>{metric.errors}</span></td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${metric.errors > 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                    {metric.errors > 5 ? "degraded" : "healthy"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Environment Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Gauge size={16} weight="duotone" className="text-amber-400" /> Environment</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "Python", value: "3.11" },
            { label: "FastAPI", value: "0.115.0" },
            { label: "Node.js", value: "20 LTS" },
            { label: "Next.js", value: "14.2" },
            { label: "PostgreSQL", value: "16" },
            { label: "Redis", value: "7" },
            { label: "ChromaDB", value: "0.5.23" },
            { label: "Gemini Model", value: "gemini-2.0-flash" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
              <span className="text-xs text-slate-400">{item.label}</span>
              <span className="text-xs text-white font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => toast.success("Cache cleared")} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-sm text-white rounded-xl hover:bg-white/10 transition-colors">
          <ArrowClockwise size={14} /> Clear Cache
        </button>
        <button onClick={() => toast.success("Vector store reindexed")} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-sm text-white rounded-xl hover:bg-white/10 transition-colors">
          <Lightning size={14} /> Reindex Vectors
        </button>
      </div>
    </div>
  );
}
