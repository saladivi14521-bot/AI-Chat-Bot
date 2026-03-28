"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Robot, Sliders, Globe, Clock, Bell, User, Building,
  ShieldCheck, Envelope, Key, SignOut, CaretRight,
  FloppyDisk, Spinner,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { businessApi, authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("ai");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI Settings
  const [personality, setPersonality] = useState("friendly");
  const [language, setLanguage] = useState("auto");
  const [upsell, setUpsell] = useState(5);
  const [autoReply, setAutoReply] = useState(true);
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [awayMsg, setAwayMsg] = useState("");

  // Business Settings
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessHoursStart, setBusinessHoursStart] = useState("09:00");
  const [businessHoursEnd, setBusinessHoursEnd] = useState("21:00");

  // Notification Settings
  const [notifications, setNotifications] = useState({
    "Angry Customer Alerts": true,
    "New Order Notifications": true,
    "Daily Summary Email": false,
    "Human Takeover Requests": true,
    "Low Stock Alerts": false,
    "Weekly Analytics Report": true,
  });

  const notificationItems = [
    { label: "Angry Customer Alerts", desc: "Get notified when AI detects angry sentiment" },
    { label: "New Order Notifications", desc: "Notify on every AI-extracted order" },
    { label: "Daily Summary Email", desc: "Receive daily performance report" },
    { label: "Human Takeover Requests", desc: "Alert when customer asks for human agent" },
    { label: "Low Stock Alerts", desc: "When product stock falls below threshold" },
    { label: "Weekly Analytics Report", desc: "Comprehensive weekly performance email" },
  ];

  const toggleNotification = (label: string) => {
    setNotifications(prev => ({ ...prev, [label]: !prev[label as keyof typeof prev] }));
  };

  // Profile Settings
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const tabs = [
    { id: "ai", label: "AI Configuration", icon: Robot, color: "text-indigo-400" },
    { id: "business", label: "Business Info", icon: Building, color: "text-cyan-400" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "text-amber-400" },
    { id: "profile", label: "Profile & Security", icon: ShieldCheck, color: "text-emerald-400" },
  ];

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await businessApi.getMyBusiness();
      const biz = res.data;
      setBusinessName(biz.name || "");
      setPersonality(biz.ai_personality || "friendly");
      setLanguage(biz.ai_language_preference || "auto");
      setUpsell(biz.upsell_aggressiveness || 5);
      setAutoReply(biz.auto_reply_enabled ?? true);
      setWelcomeMsg(biz.welcome_message || "");
      setAwayMsg(biz.away_message || "");
    } catch { }
    finally { setLoading(false); }
  };

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      await businessApi.updateAISettings({
        ai_personality: personality,
        ai_language_preference: language,
        upsell_aggressiveness: upsell,
        auto_reply_enabled: autoReply,
        welcome_message: welcomeMsg,
        away_message: awayMsg,
      });
      toast.success("AI settings saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      await businessApi.updateBusiness({
        name: businessName,
        business_hours_start: businessHoursStart,
        business_hours_end: businessHoursEnd,
      });
      toast.success("Business info saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (fullName !== user?.full_name) {
        await authApi.updateMe({ full_name: fullName });
      }
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill both password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size={32} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure your AI assistant and business preferences</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-56 shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${activeTab === tab.id ? "bg-white/[0.05] border border-white/[0.08] text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.02]"}`}>
                <Icon size={18} weight="duotone" className={activeTab === tab.id ? tab.color : ""} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* AI Configuration */}
          {activeTab === "ai" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Robot size={18} weight="duotone" className="text-indigo-400" /> AI Personality & Behavior
                </h3>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Personality</label>
                  <select value={personality} onChange={e => setPersonality(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="friendly">Friendly & Helpful</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual & Fun</option>
                    <option value="formal">Formal & Respectful</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Language Preference</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="auto">Auto-Detect</option>
                    <option value="bangla">Bangla</option>
                    <option value="banglish">Banglish</option>
                    <option value="english">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Upsell Aggressiveness: {upsell}/10</label>
                  <input type="range" min={1} max={10} value={upsell} onChange={e => setUpsell(Number(e.target.value))}
                    className="w-full accent-indigo-500" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm text-white">Auto-Reply</div>
                    <div className="text-xs text-slate-500">AI will automatically respond to all messages</div>
                  </div>
                  <button onClick={() => setAutoReply(!autoReply)}
                    className={`w-12 h-7 rounded-full transition-colors relative ${autoReply ? "bg-indigo-500" : "bg-white/10"}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${autoReply ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-white">Messages</h3>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Welcome Message</label>
                  <textarea value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} rows={2}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Message sent when a new customer starts a conversation..." />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Away Message</label>
                  <textarea value={awayMsg} onChange={e => setAwayMsg(e.target.value)} rows={2}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Message sent outside business hours..." />
                </div>
              </div>
              <button onClick={handleSaveAI} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50">
                {saving ? <Spinner size={16} className="animate-spin" /> : <FloppyDisk size={16} />} Save AI Settings
              </button>
            </motion.div>
          )}

          {/* Business Info */}
          {activeTab === "business" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Building size={18} weight="duotone" className="text-cyan-400" /> Business Information
                </h3>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Business Name</label>
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">Business Hours Start</label>
                    <input type="time" value={businessHoursStart} onChange={e => setBusinessHoursStart(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5">Business Hours End</label>
                    <input type="time" value={businessHoursEnd} onChange={e => setBusinessHoursEnd(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>
              <button onClick={handleSaveBusiness} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50">
                {saving ? <Spinner size={16} className="animate-spin" /> : <FloppyDisk size={16} />} Save Business Info
              </button>
            </motion.div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Bell size={18} weight="duotone" className="text-amber-400" /> Notification Preferences
                </h3>
                {notificationItems.map((notif) => {
                  const enabled = notifications[notif.label as keyof typeof notifications];
                  return (
                    <div key={notif.label} className="flex items-center justify-between py-3 border-b border-white/[0.03] last:border-0">
                      <div>
                        <div className="text-sm text-white font-medium">{notif.label}</div>
                        <div className="text-xs text-slate-500">{notif.desc}</div>
                      </div>
                      <button onClick={() => toggleNotification(notif.label)}
                        className={`w-12 h-7 rounded-full transition-colors relative ${enabled ? "bg-indigo-500" : "bg-white/10"}`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${enabled ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Profile & Security */}
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <User size={18} weight="duotone" className="text-emerald-400" /> Profile
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                    {fullName.split(" ").map(n => n[0]).join("") || "U"}
                  </div>
                  <div>
                    <div className="text-white font-medium">{fullName}</div>
                    <div className="text-sm text-slate-400">{email}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Spinner size={16} className="animate-spin" /> : <FloppyDisk size={16} />} Update Profile
                </button>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Key size={18} weight="duotone" className="text-amber-400" /> Change Password
                </h3>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Enter current password" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Min 8 characters" />
                </div>
                <button onClick={handleChangePassword} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Spinner size={16} className="animate-spin" /> : <Key size={16} />} Change Password
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
