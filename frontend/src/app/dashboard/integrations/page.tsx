"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plug, FacebookLogo, Spinner, Trash, CheckCircle, Globe,
  LinkSimple, WarningCircle, SpinnerGap, MagnifyingGlass,
  Package, Tag, ArrowsClockwise, Brain, Lightning, CaretDown, CaretUp,
  ChatTeardropDots, Eye, ToggleLeft, ToggleRight, Robot,
  ChartBar, Clock, ChatCenteredText, Notebook,
} from "@phosphor-icons/react";
import { integrationsApi, scraperApi } from "@/lib/api";
import { toast } from "sonner";

interface FacebookPage {
  id: string;
  page_id: string;
  page_name?: string;
  page_picture_url?: string;
  status: string;
  is_active: boolean;
  connected_at: string;
}

interface MonitorSettings {
  auto_comment_reply_enabled: boolean;
  page_monitor_enabled: boolean;
  page_sync_interval_minutes: number;
}

interface MonitorStats {
  total_posts_tracked: number;
  posts_learned: number;
  total_comments_replied: number;
  replies_last_24h: number;
  recent_replies: Array<{
    commenter: string;
    comment: string;
    reply: string;
    replied_at: string;
  }>;
}

export default function IntegrationsPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [analyzingPageId, setAnalyzingPageId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Page Monitor state
  const [monitorSettings, setMonitorSettings] = useState<MonitorSettings>({
    auto_comment_reply_enabled: false,
    page_monitor_enabled: false,
    page_sync_interval_minutes: 30,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingPageId, setSyncingPageId] = useState<string | null>(null);
  const [checkingCommentsPageId, setCheckingCommentsPageId] = useState<string | null>(null);
  const [statsPageId, setStatsPageId] = useState<string | null>(null);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);

  useEffect(() => { loadPages(); loadSettings(); }, []);

  const loadPages = async () => {
    try {
      const res = await integrationsApi.listFacebookPages();
      setPages(res.data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const loadSettings = async () => {
    try {
      const res = await integrationsApi.getMonitorSettings();
      setMonitorSettings(res.data);
    } catch { }
  };

  const connectFacebook = async () => {
    setConnecting(true);
    try {
      const res = await integrationsApi.getFacebookAuthUrl();
      const { auth_url } = res.data;
      window.location.href = auth_url;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to start Facebook connection. Check FB_APP_ID in .env");
      setConnecting(false);
    }
  };

  const disconnectPage = async (id: string) => {
    if (!confirm("Disconnect this page?")) return;
    try {
      await integrationsApi.disconnectFacebookPage(id);
      toast.success("Page disconnected");
      loadPages();
    } catch { toast.error("Failed to disconnect"); }
  };

  const analyzePageContent = async (pageId: string) => {
    setAnalyzingPageId(pageId);
    setAnalysisResult(null);
    setShowAnalysis(false);
    try {
      const res = await scraperApi.analyzePageContent({ page_id: pageId });
      setAnalysisResult(res.data);
      setShowAnalysis(true);
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to analyze page content");
    } finally {
      setAnalyzingPageId(null);
    }
  };

  // ===== PAGE MONITOR FUNCTIONS =====

  const toggleSetting = async (key: keyof MonitorSettings) => {
    setSavingSettings(true);
    const newVal = !monitorSettings[key];
    try {
      const res = await integrationsApi.updateMonitorSettings({ [key]: newVal });
      setMonitorSettings(res.data);
      toast.success(`${key === "auto_comment_reply_enabled" ? "Auto Comment Reply" : "Page Monitor"} ${newVal ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const syncPage = async (pageId: string) => {
    setSyncingPageId(pageId);
    setSyncResult(null);
    setShowSyncResult(false);
    try {
      const res = await integrationsApi.syncPageContent(pageId);
      setSyncResult(res.data);
      setShowSyncResult(true);
      toast.success(res.data.message || "Sync complete!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Sync failed");
    } finally {
      setSyncingPageId(null);
    }
  };

  const checkComments = async (pageId: string) => {
    setCheckingCommentsPageId(pageId);
    try {
      const res = await integrationsApi.checkAndReplyComments(pageId);
      toast.success(`Checked ${res.data.comments_checked} comments, replied to ${res.data.replies_sent}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to check comments");
    } finally {
      setCheckingCommentsPageId(null);
    }
  };

  const loadStats = async (pageId: string) => {
    if (statsPageId === pageId && showStats) {
      setShowStats(false);
      return;
    }
    setStatsPageId(pageId);
    setStats(null);
    try {
      const res = await integrationsApi.getPageMonitorStats(pageId);
      setStats(res.data);
      setShowStats(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load stats");
    }
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
        <h2 className="text-2xl font-bold text-white">Integrations</h2>
        <p className="text-sm text-slate-400 mt-1">Connect your social media accounts & manage AI monitoring</p>
      </motion.div>

      {/* Facebook Messenger */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <FacebookLogo size={28} weight="fill" className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Facebook Messenger</h3>
            <p className="text-sm text-slate-400">Connect your Facebook Pages to receive and respond to messages</p>
          </div>
        </div>

        {pages.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-300">Connected Pages</h4>
              <button onClick={connectFacebook} disabled={connecting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                {connecting ? <Spinner size={14} className="animate-spin" /> : <FacebookLogo size={14} weight="fill" />}
                Connect Another Page
              </button>
            </div>
            {pages.map(page => (
              <div key={page.id} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <FacebookLogo size={20} weight="fill" className="text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{page.page_name || page.page_id}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CheckCircle size={12} className="text-emerald-400" />
                        <span className="text-xs text-emerald-400">Connected</span>
                        <span className="text-xs text-slate-500">• {new Date(page.connected_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Sync Button */}
                    <button
                      onClick={() => syncPage(page.id)}
                      disabled={syncingPageId === page.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      title="Sync posts & learn content"
                    >
                      {syncingPageId === page.id ? (
                        <SpinnerGap size={13} className="animate-spin" />
                      ) : (
                        <ArrowsClockwise size={13} weight="bold" />
                      )}
                      {syncingPageId === page.id ? "Syncing..." : "Sync"}
                    </button>
                    {/* Check Comments Button */}
                    <button
                      onClick={() => checkComments(page.id)}
                      disabled={checkingCommentsPageId === page.id || !monitorSettings.auto_comment_reply_enabled}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                      title={monitorSettings.auto_comment_reply_enabled ? "Check & reply to comments" : "Enable Auto Comment Reply first"}
                    >
                      {checkingCommentsPageId === page.id ? (
                        <SpinnerGap size={13} className="animate-spin" />
                      ) : (
                        <ChatTeardropDots size={13} weight="bold" />
                      )}
                      Reply
                    </button>
                    {/* Stats Button */}
                    <button
                      onClick={() => loadStats(page.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-medium hover:bg-indigo-500/20 transition-colors"
                      title="View monitoring stats"
                    >
                      <ChartBar size={13} weight="bold" />
                      Stats
                    </button>
                    {/* Analyze Button */}
                    <button
                      onClick={() => analyzePageContent(page.id)}
                      disabled={analyzingPageId === page.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                    >
                      {analyzingPageId === page.id ? (
                        <SpinnerGap size={13} className="animate-spin" />
                      ) : (
                        <MagnifyingGlass size={13} weight="bold" />
                      )}
                      Analyze
                    </button>
                    <button onClick={() => disconnectPage(page.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-8 text-center">
            <FacebookLogo size={48} weight="fill" className="text-blue-400 mx-auto mb-4" />
            <h4 className="text-base font-semibold text-white mb-2">No Pages Connected</h4>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Connect your Facebook Pages to let SmartRep AI automatically respond to customer messages on Messenger.
            </p>
            <button onClick={connectFacebook} disabled={connecting}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {connecting ? (
                <Spinner size={18} className="animate-spin" />
              ) : (
                <FacebookLogo size={20} weight="fill" />
              )}
              {connecting ? "Redirecting to Facebook..." : "Connect Facebook Page"}
            </button>
            <p className="text-[10px] text-slate-500 mt-4 max-w-sm mx-auto">
              You&apos;ll be redirected to Facebook to authorize SmartRep AI. We only request permissions needed for messaging.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <LinkSimple size={16} className="text-indigo-400" /> Webhook URL
          </h4>
          <p className="text-xs text-slate-400 mb-2">Configure this URL in your Facebook App webhook settings:</p>
          <code className="block px-4 py-2.5 bg-black/30 rounded-lg text-xs text-indigo-300 font-mono">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/webhook/facebook
          </code>
        </div>
      </motion.div>

      {/* ===== PAGE MONITOR & AUTO-REPLY SETTINGS ===== */}
      {pages.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Robot size={28} weight="duotone" className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI Page Monitor</h3>
              <p className="text-sm text-slate-400">Auto-learn from posts & reply to comments with AI</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Page Monitor Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="flex items-center gap-3">
                <Eye size={22} weight="duotone" className="text-emerald-400" />
                <div>
                  <div className="text-sm font-medium text-white">Page Content Monitor</div>
                  <div className="text-xs text-slate-400">Automatically track new posts and learn content into AI Knowledge Base</div>
                </div>
              </div>
              <button
                onClick={() => toggleSetting("page_monitor_enabled")}
                disabled={savingSettings}
                className="transition-colors"
              >
                {monitorSettings.page_monitor_enabled ? (
                  <ToggleRight size={36} weight="fill" className="text-emerald-400" />
                ) : (
                  <ToggleLeft size={36} weight="fill" className="text-slate-500" />
                )}
              </button>
            </div>

            {/* Auto Comment Reply Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="flex items-center gap-3">
                <ChatTeardropDots size={22} weight="duotone" className="text-amber-400" />
                <div>
                  <div className="text-sm font-medium text-white">Auto Comment Reply</div>
                  <div className="text-xs text-slate-400">AI automatically replies to comments on your posts using your product & KB data</div>
                </div>
              </div>
              <button
                onClick={() => toggleSetting("auto_comment_reply_enabled")}
                disabled={savingSettings}
                className="transition-colors"
              >
                {monitorSettings.auto_comment_reply_enabled ? (
                  <ToggleRight size={36} weight="fill" className="text-amber-400" />
                ) : (
                  <ToggleLeft size={36} weight="fill" className="text-slate-500" />
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10 rounded-xl">
              <h4 className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-1.5">
                <Brain size={14} weight="duotone" /> How it works
              </h4>
              <ul className="text-xs text-slate-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span><strong className="text-slate-300">Page Monitor</strong> syncs your posts and extracts useful info (products, offers, announcements) into the AI&apos;s Knowledge Base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span><strong className="text-slate-300">Auto Comment Reply</strong> uses RAG (your products + KB) to intelligently reply to customer comments on posts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span><strong className="text-slate-300">Real-time</strong> via webhook — new posts & comments are processed instantly when Facebook sends them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-400 mt-0.5">•</span>
                  <span>Click <strong className="text-slate-300">Sync</strong> on any page to manually pull all recent posts and learn their content</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== SYNC RESULT ===== */}
      <AnimatePresence>
        {showSyncResult && syncResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowsClockwise size={22} weight="duotone" className="text-emerald-400" />
                Sync Results
              </h3>
              <button onClick={() => setShowSyncResult(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "New Posts", value: syncResult.sync?.new_posts ?? 0, color: "text-blue-400" },
                { label: "KB Learned", value: syncResult.sync?.kb_entries_added ?? 0, color: "text-emerald-400" },
                { label: "Comments Checked", value: syncResult.comments?.comments_checked ?? 0, color: "text-amber-400" },
                { label: "Replies Sent", value: syncResult.comments?.replies_sent ?? 0, color: "text-pink-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center">{syncResult.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MONITOR STATS ===== */}
      <AnimatePresence>
        {showStats && stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/[0.02] border border-indigo-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ChartBar size={22} weight="duotone" className="text-indigo-400" />
                Monitor Stats — {(stats as any).page_name || "Page"}
              </h3>
              <button onClick={() => setShowStats(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Posts Tracked", value: stats.total_posts_tracked, color: "text-blue-400", icon: <Notebook size={16} className="text-blue-400" /> },
                { label: "Posts Learned", value: stats.posts_learned, color: "text-emerald-400", icon: <Brain size={16} className="text-emerald-400" /> },
                { label: "Total Replies", value: stats.total_comments_replied, color: "text-amber-400", icon: <ChatCenteredText size={16} className="text-amber-400" /> },
                { label: "Last 24h Replies", value: stats.replies_last_24h, color: "text-pink-400", icon: <Clock size={16} className="text-pink-400" /> },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="flex justify-center mb-1">{stat.icon}</div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Replies */}
            {stats.recent_replies.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-1.5">
                  <ChatTeardropDots size={16} weight="duotone" className="text-amber-400" />
                  Recent Auto-Replies ({stats.recent_replies.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.recent_replies.map((r, i) => (
                    <div key={i} className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-white">{r.commenter}</span>
                        <span className="text-[10px] text-slate-500">
                          {r.replied_at ? new Date(r.replied_at).toLocaleString() : ""}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-1 bg-white/[0.02] rounded-lg px-3 py-1.5">
                        💬 {r.comment}
                      </div>
                      <div className="text-xs text-emerald-400/80 bg-emerald-500/5 rounded-lg px-3 py-1.5 border border-emerald-500/10">
                        🤖 {r.reply}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.recent_replies.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">
                No auto-replies yet. Enable Auto Comment Reply and sync your page to get started.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Analysis Results */}
      <AnimatePresence>
        {showAnalysis && analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/[0.02] border border-purple-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain size={24} weight="duotone" className="text-purple-400" />
                Page Content Analysis
              </h3>
              <button onClick={() => setShowAnalysis(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                Dismiss
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Posts Analyzed", value: analysisResult.posts_analyzed, color: "text-blue-400" },
                { label: "Products Found", value: analysisResult.products_found, color: "text-amber-400" },
                { label: "Products Added", value: analysisResult.products_added, color: "text-emerald-400" },
                { label: "Offers Found", value: analysisResult.offers_found, color: "text-pink-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Extracted Products */}
            {analysisResult.data?.products?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1.5">
                  <Package size={16} weight="duotone" className="text-amber-400" />
                  Products from Posts ({analysisResult.data.products.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisResult.data.products.map((p: any, i: number) => (
                    <div key={i} className="bg-white/[0.02] rounded-lg p-3 flex items-center justify-between border border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] && (
                          <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                        )}
                        <span className="text-sm text-white">{p.name}</span>
                      </div>
                      <span className="text-sm font-medium text-emerald-400">৳{p.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers */}
            {analysisResult.data?.offers?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1.5">
                  <Tag size={16} weight="duotone" className="text-pink-400" />
                  Offers & Deals ({analysisResult.data.offers.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisResult.data.offers.map((o: any, i: number) => (
                    <div key={i} className="bg-pink-500/5 rounded-lg p-3 border border-pink-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium">{o.title}</span>
                        <div className="flex items-center gap-2">
                          {o.original_price && <span className="text-xs text-slate-500 line-through">৳{o.original_price}</span>}
                          <span className="text-sm font-bold text-pink-400">৳{o.price}</span>
                          {o.discount_percent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400">
                              -{o.discount_percent}%
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{o.description}</p>
                      {o.products_included?.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Includes: {o.products_included.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Updates */}
            {analysisResult.data?.updates?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1.5">
                  <Lightning size={16} weight="duotone" className="text-cyan-400" />
                  Business Updates ({analysisResult.data.updates.length})
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {analysisResult.data.updates.map((u: any, i: number) => (
                    <div key={i} className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-sm text-white">{u.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{u.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 mt-4 text-center">
              All discovered products, offers, and updates have been saved to your Knowledge Base automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp (Coming Soon) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Globe size={28} weight="duotone" className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">WhatsApp Business</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">Coming Soon</span>
            </div>
            <p className="text-sm text-slate-400">Connect WhatsApp Business API for customer communication</p>
          </div>
        </div>
      </motion.div>

      {/* Instagram (Coming Soon) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Globe size={28} weight="duotone" className="text-pink-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Instagram DM</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">Coming Soon</span>
            </div>
            <p className="text-sm text-slate-400">Handle Instagram direct messages with AI</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
