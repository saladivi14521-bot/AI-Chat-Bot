"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  House,
  ChatCircleDots,
  Package,
  ChartBar,
  Gear,
  Plug,
  ShoppingCart,
  UserCircle,
  SignOut,
  CaretLeft,
  CaretRight,
  Robot,
  Brain,
  Bell,
  GlobeSimple,
} from "@phosphor-icons/react";
import { useAuthStore } from "@/stores/auth-store";

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: House, color: "text-indigo-400" },
  { label: "Conversations", href: "/dashboard/conversations", icon: ChatCircleDots, color: "text-cyan-400" },
  { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: Brain, color: "text-purple-400" },
  { label: "Products", href: "/dashboard/products", icon: Package, color: "text-amber-400" },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart, color: "text-emerald-400" },
  { label: "Website Import", href: "/dashboard/import", icon: GlobeSimple, color: "text-teal-400" },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartBar, color: "text-pink-400" },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug, color: "text-blue-400" },
  { label: "Settings", href: "/dashboard/settings", icon: Gear, color: "text-slate-400" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loadFromStorage, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push("/login");
    }
  }, [mounted, user]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        className="fixed left-0 top-0 bottom-0 z-40 bg-[#0B1120] border-r border-white/[0.06] flex flex-col sidebar-transition"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Robot size={18} weight="fill" className="text-white" />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg font-bold text-white whitespace-nowrap"
              >
                Smart<span className="text-indigo-400">Rep</span>
              </motion.span>
            )}
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-500 rounded-full"
                  />
                )}
                <Icon
                  size={22}
                  weight="duotone"
                  className={isActive ? item.color : "text-slate-500 group-hover:text-slate-300"}
                />
                {!collapsed && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-white/[0.06]">
          {/* User */}
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-sm font-medium text-white truncate">
                  {user.full_name}
                </div>
                <div className="text-xs text-slate-500 truncate">{user.email}</div>
              </div>
            )}
          </div>

          {/* Collapse & Logout */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors"
            >
              {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
              {!collapsed && "Collapse"}
            </button>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="flex items-center justify-center px-3 py-2 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-white">
              {sidebarItems.find((i) => pathname === i.href || (i.href !== "/dashboard" && pathname?.startsWith(i.href)))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Bell size={20} weight="duotone" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
