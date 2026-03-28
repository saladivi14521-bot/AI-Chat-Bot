"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ChartBar, Users, Gear, SignOut,
  CaretLeft, CaretRight, Bell, Lightning
} from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";

const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: ChartBar, color: "text-indigo-400" },
  { label: "Users", href: "/admin/users", icon: Users, color: "text-cyan-400" },
  { label: "System", href: "/admin/system", icon: Gear, color: "text-amber-400" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "super_admin") { router.push("/dashboard"); return; }
  }, [user, router]);

  if (!user || user.role !== "super_admin") return null;

  const handleLogout = () => { logout(); router.push("/login"); };

  return (
    <div className="flex h-screen bg-[#030712]">
      {/* Sidebar */}
      <motion.aside animate={{ width: collapsed ? 72 : 240 }} className="h-full border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} weight="fill" className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
                <div className="text-sm font-bold text-white whitespace-nowrap">Admin Panel</div>
                <div className="text-[10px] text-red-400">SmartRep AI</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNavItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? "bg-white/[0.05] text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.02]"}`}>
                <item.icon size={20} weight={isActive ? "duotone" : "regular"} className={isActive ? item.color : ""} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/[0.03] transition-colors">
            {collapsed ? <CaretRight size={16} /> : <><CaretLeft size={16} /><span className="text-xs">Collapse</span></>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-400/60 hover:text-red-400 rounded-xl hover:bg-red-500/5 transition-colors">
            <SignOut size={16} />
            {!collapsed && <span className="text-xs">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} weight="fill" className="text-red-400" />
            <span className="text-sm text-slate-400">Super Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <Link href="/dashboard" className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-slate-300 rounded-lg hover:bg-white/10 transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
}
