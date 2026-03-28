"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Plus, MagnifyingGlass, Spinner, Trash, PencilSimple,
  X, FileText, Question, Tag, ShieldCheck, Book, FloppyDisk,
  CheckSquare, Square, MinusSquare,
} from "@phosphor-icons/react";
import { knowledgeBaseApi } from "@/lib/api";
import { toast } from "sonner";

interface KBEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  faq: { label: "FAQ", icon: Question, color: "text-cyan-400 bg-cyan-500/10" },
  product: { label: "Product", icon: Tag, color: "text-amber-400 bg-amber-500/10" },
  policy: { label: "Policy", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-500/10" },
  custom_qa: { label: "Custom Q&A", icon: Book, color: "text-purple-400 bg-purple-500/10" },
  general: { label: "General", icon: FileText, color: "text-indigo-400 bg-indigo-500/10" },
};

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KBEntry | null>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "general" });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => { loadEntries(); }, [typeFilter]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (typeFilter) params.type = typeFilter;
      const res = await knowledgeBaseApi.list(params);
      setEntries(res.data.items || []);
    } catch { }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingEntry(null);
    setForm({ title: "", content: "", type: "general" });
    setShowModal(true);
  };

  const openEdit = (entry: KBEntry) => {
    setEditingEntry(entry);
    setForm({ title: entry.title, content: entry.content, type: entry.type });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      if (editingEntry) {
        await knowledgeBaseApi.update(editingEntry.id, form);
        toast.success("Entry updated!");
      } else {
        await knowledgeBaseApi.create({ ...form, metadata: {} });
        toast.success("Entry created!");
      }
      setShowModal(false);
      loadEntries();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await knowledgeBaseApi.delete(id);
      toast.success("Entry deleted");
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadEntries();
    } catch { toast.error("Failed to delete"); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected entries?`)) return;
    setBulkDeleting(true);
    try {
      await knowledgeBaseApi.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} entries deleted`);
      setSelectedIds(new Set());
      loadEntries();
    } catch { toast.error("Failed to delete entries"); }
    finally { setBulkDeleting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const filtered = entries.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Knowledge Base</h2>
          <p className="text-sm text-slate-400 mt-1">{entries.length} entries • Train your AI with business knowledge</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
          <Plus size={16} weight="bold" /> Add Entry
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="flex gap-2">
          {["", "faq", "product", "policy", "custom_qa", "general"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${typeFilter === t ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"}`}>
              {t ? typeConfig[t]?.label || t : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {filtered.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3">
          <button onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            {selectedIds.size === filtered.length ? <CheckSquare size={16} weight="duotone" className="text-indigo-400" /> : selectedIds.size > 0 ? <MinusSquare size={16} weight="duotone" className="text-indigo-400" /> : <Square size={16} />}
            {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-slate-400">{selectedIds.size} selected</span>
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                {bulkDeleting ? <Spinner size={14} className="animate-spin" /> : <Trash size={14} />}
                Delete Selected
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Spinner size={32} className="text-indigo-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Brain size={48} weight="duotone" className="text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {entries.length === 0 ? "No Knowledge Base Entries" : "No matching entries"}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            {entries.length === 0 ? "Add FAQs, product info, policies and more to train your AI assistant." : "Try a different search or filter."}
          </p>
          {entries.length === 0 && (
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus size={16} /> Add First Entry
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry, i) => {
            const config = typeConfig[entry.type] || typeConfig.general;
            const Icon = config.icon;
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white/[0.02] border rounded-xl p-5 hover:border-white/[0.1] transition-colors group ${selectedIds.has(entry.id) ? "border-indigo-500/40 ring-1 ring-indigo-500/20" : "border-white/[0.06]"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSelect(entry.id)}
                      className={`transition-all ${selectedIds.has(entry.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {selectedIds.has(entry.id)
                        ? <CheckSquare size={18} weight="fill" className="text-indigo-400" />
                        : <Square size={18} className="text-slate-500" />}
                    </button>
                    <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}>
                      <Icon size={16} weight="duotone" />
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(entry)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1.5 truncate">{entry.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-3 mb-3">{entry.content}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                  <span className="text-[10px] text-slate-500">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{editingEntry ? "Edit Entry" : "New Entry"}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Entry title..." />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="general">General</option>
                  <option value="faq">FAQ</option>
                  <option value="product">Product</option>
                  <option value="policy">Policy</option>
                  <option value="custom_qa">Custom Q&A</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Content</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={6}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" placeholder="Write your knowledge content..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Spinner size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
                  {editingEntry ? "Update" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
