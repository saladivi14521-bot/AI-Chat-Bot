"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChatCircleDots, MagnifyingGlass, Spinner, Robot,
  PaperPlaneRight, UserCircle, ArrowRight,
} from "@phosphor-icons/react";
import { conversationsApi } from "@/lib/api";
import Link from "next/link";

interface Conversation {
  id: string;
  customer?: { id: string; name?: string; profile_picture?: string; platform: string; segment: string };
  status: string;
  current_sentiment: string;
  message_count: number;
  last_message_at?: string;
  last_message?: { content: string; role: string; created_at: string };
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    try {
      const res = await conversationsApi.list({ page_size: 50 });
      setConversations(res.data.items || []);
    } catch { }
    finally { setLoading(false); }
  };

  const selectConversation = async (id: string) => {
    setSelectedId(id);
    setMsgLoading(true);
    try {
      const res = await conversationsApi.getMessages(id, { page_size: 100 });
      setMessages(res.data.items || []);
    } catch { }
    finally { setMsgLoading(false); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await conversationsApi.sendMessage(selectedId, replyText);
      setMessages(prev => [...prev, res.data]);
      setReplyText("");
    } catch { }
    finally { setSending(false); }
  };

  const selected = conversations.find(c => c.id === selectedId);
  const filtered = conversations.filter(c =>
    !search || c.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.last_message?.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size={32} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-white">Conversations</h2>
          <p className="text-sm text-slate-400 mt-1">Manage customer conversations</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <ChatCircleDots size={48} weight="duotone" className="text-indigo-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Conversations Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Connect your Facebook page to start receiving customer messages. Your AI will handle them automatically!
          </p>
          <Link href="/dashboard/integrations" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors">
            Connect Facebook Page <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">Conversations</h2>
        <p className="text-sm text-slate-400 mt-1">{conversations.length} total conversations</p>
      </motion.div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <div className="w-80 shrink-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(conv => (
              <button key={conv.id} onClick={() => selectConversation(conv.id)}
                className={`w-full p-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors text-left border-b border-white/[0.03] ${selectedId === conv.id ? "bg-white/[0.05]" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {conv.customer?.name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">{conv.customer?.name || "Unknown"}</span>
                    <span className="text-[10px] text-slate-500">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{conv.last_message?.content || "No messages"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${conv.status === "ai_handling" ? "bg-indigo-500/10 text-indigo-400" : conv.status === "human_handling" ? "bg-amber-500/10 text-amber-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {conv.status.replace("_", " ")}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${conv.current_sentiment === "positive" ? "bg-emerald-500/10 text-emerald-400" : conv.current_sentiment === "angry" ? "bg-red-500/10 text-red-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {conv.current_sentiment}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChatCircleDots size={48} weight="duotone" className="text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {selected?.customer?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{selected?.customer?.name || "Unknown"}</div>
                  <div className="text-xs text-slate-500">{selected?.customer?.platform} • {selected?.message_count} messages</div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Spinner size={24} className="text-indigo-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-slate-500">No messages</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === "customer" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === "customer" ? "bg-white/[0.05] text-slate-200" :
                        msg.role === "ai" ? "bg-indigo-500/20 text-indigo-100 border border-indigo-500/20" :
                        "bg-emerald-500/20 text-emerald-100 border border-emerald-500/20"
                      }`}>
                        {msg.role !== "customer" && (
                          <div className="text-[10px] text-slate-500 mb-1">
                            {msg.role === "ai" ? "🤖 AI" : "👤 Human Agent"}
                          </div>
                        )}
                        {msg.content}
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Box */}
              <div className="p-3 border-t border-white/[0.06]">
                <div className="flex gap-2">
                  <input type="text" placeholder="Type a reply as human agent..." value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendReply()}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors disabled:opacity-50">
                    {sending ? <Spinner size={18} className="animate-spin" /> : <PaperPlaneRight size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
