"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, MagnifyingGlass, Spinner, Trash, ShieldCheck,
  UserCircle, ToggleLeft, ToggleRight,
} from "@phosphor-icons/react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (search) params.search = search;
      const res = await adminApi.listUsers(params);
      setUsers(res.data.items || []);
    } catch { }
    finally { setLoading(false); }
  };

  const toggleActive = async (userId: string) => {
    try {
      await adminApi.toggleUserActive(userId);
      toast.success("User status updated");
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user and all their data?")) return;
    try {
      await adminApi.deleteUser(userId);
      toast.success("User deleted");
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <p className="text-sm text-slate-400 mt-1">{users.length} total users</p>
      </motion.div>

      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search users..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && loadUsers()}
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Spinner size={32} className="text-red-400 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Users size={48} weight="duotone" className="text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Users Found</h3>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">User</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Role</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Last Login</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Joined</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                        {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{user.full_name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${user.role === "super_admin" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs ${user.is_active ? "text-emerald-400" : "text-red-400"}`}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    {user.role !== "super_admin" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActive(user.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title={user.is_active ? "Deactivate" : "Activate"}>
                          {user.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => deleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete">
                          <Trash size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
