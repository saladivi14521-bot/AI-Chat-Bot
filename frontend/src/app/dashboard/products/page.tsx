"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, MagnifyingGlass, Spinner, Trash, PencilSimple,
  X, FloppyDisk, CurrencyDollar, ImageSquare, PlusCircle, XCircle,
  CheckSquare, Square, MinusSquare,
} from "@phosphor-icons/react";
import { productsApi } from "@/lib/api";
import { toast } from "sonner";

interface ProductVariant {
  name: string;
  sku?: string;
  price: number;
  original_price?: number;
  stock?: number;
  is_default?: boolean;
  is_active?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sale_price?: number;
  currency: string;
  category?: string;
  tags: string[];
  images: string[];
  variants: ProductVariant[];
  stock_quantity: number;
  is_available: boolean;
  ai_description?: string;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", sale_price: "", category: "", stock_quantity: "0", is_available: true, images: [""] as string[], variants: [] as {name: string, price: string}[] });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (categoryFilter) params.category = categoryFilter;
      if (search) params.search = search;
      const res = await productsApi.list(params);
      setProducts(res.data.items || []);
    } catch { }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", price: "", sale_price: "", category: "", stock_quantity: "0", is_available: true, images: [""], variants: [] });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price.toString(),
      sale_price: p.sale_price?.toString() || "",
      category: p.category || "",
      stock_quantity: p.stock_quantity.toString(),
      is_available: p.is_available,
      images: p.images && p.images.length > 0 ? [...p.images] : [""],
      variants: p.variants && p.variants.length > 0 ? p.variants.map(v => ({name: v.name, price: v.price.toString()})) : [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    try {
      const imageUrls = form.images.map(u => u.trim()).filter(Boolean);
      const variantsList = form.variants
        .filter(v => v.name.trim() && v.price.trim())
        .map(v => ({ name: v.name.trim(), price: parseFloat(v.price) || 0 }));
      const data = {
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : undefined,
        category: form.category || undefined,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        is_available: form.is_available,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        variants: variantsList.length > 0 ? variantsList : undefined,
      };
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
        toast.success("Product updated!");
      } else {
        await productsApi.create(data);
        toast.success("Product created!");
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await productsApi.delete(id);
      toast.success("Product deleted");
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      loadProducts();
    } catch { toast.error("Failed to delete"); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected products?`)) return;
    setBulkDeleting(true);
    try {
      await productsApi.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} products deleted`);
      setSelectedIds(new Set());
      loadProducts();
    } catch { toast.error("Failed to delete products"); }
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
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Products</h2>
          <p className="text-sm text-slate-400 mt-1">{products.length} products</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
          <Plus size={16} weight="bold" /> Add Product
        </button>
      </motion.div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); }}
            onKeyDown={e => e.key === "Enter" && loadProducts()}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2">
            <button onClick={() => { setCategoryFilter(""); loadProducts(); }}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${!categoryFilter ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "border-white/10 text-slate-400 hover:text-white"}`}>All</button>
            {categories.map(c => (
              <button key={c} onClick={() => { setCategoryFilter(c); }}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${categoryFilter === c ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "border-white/10 text-slate-400 hover:text-white"}`}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {products.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3">
          <button onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            {selectedIds.size === products.length ? <CheckSquare size={16} weight="duotone" className="text-indigo-400" /> : selectedIds.size > 0 ? <MinusSquare size={16} weight="duotone" className="text-indigo-400" /> : <Square size={16} />}
            {selectedIds.size === products.length ? "Deselect All" : "Select All"}
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

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Spinner size={32} className="text-indigo-400 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Package size={48} weight="duotone" className="text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Products Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Add your products so the AI can recommend them to customers and handle orders.
          </p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={16} /> Add First Product
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white/[0.02] border rounded-xl overflow-hidden hover:border-white/[0.1] transition-colors group ${selectedIds.has(product.id) ? "border-indigo-500/40 ring-1 ring-indigo-500/20" : "border-white/[0.06]"}`}>
              {/* Product Image */}
              {product.images && product.images.length > 0 ? (
                <div className="relative w-full h-44 bg-white/5">
                  {/* Selection checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                    className={`absolute top-2 left-2 z-10 p-0.5 rounded-md transition-all ${selectedIds.has(product.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    {selectedIds.has(product.id)
                      ? <CheckSquare size={22} weight="fill" className="text-indigo-400 drop-shadow-lg" />
                      : <Square size={22} className="text-white/70 drop-shadow-lg" />}
                  </button>
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                  />
                  <div className="hidden w-full h-full absolute inset-0 flex items-center justify-center bg-white/5">
                    <ImageSquare size={32} weight="duotone" className="text-slate-600" />
                  </div>
                  {product.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white/80">
                      +{product.images.length - 1} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-44 bg-white/5 flex items-center justify-center">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                    className={`absolute top-2 left-2 z-10 p-0.5 rounded-md transition-all ${selectedIds.has(product.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    {selectedIds.has(product.id)
                      ? <CheckSquare size={22} weight="fill" className="text-indigo-400 drop-shadow-lg" />
                      : <Square size={22} className="text-white/70 drop-shadow-lg" />}
                  </button>
                  <ImageSquare size={32} weight="duotone" className="text-slate-600" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white truncate flex-1 mr-2">{product.name}</h4>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(product)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
                {product.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{product.description}</p>}
                {/* Variants / Sizes */}
                {product.variants && product.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {product.variants.filter(v => v.is_active !== false).map((v, vi) => (
                      <span key={vi} className={`text-[10px] px-2 py-1 rounded-lg border ${v.is_default ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-white/[0.08] bg-white/[0.03] text-slate-400"}`}>
                        {v.name} — ৳{v.price.toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">৳{product.price.toLocaleString()}</span>
                    {product.sale_price && <span className="text-xs text-slate-500 line-through">৳{product.sale_price.toLocaleString()}</span>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${product.is_available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {product.is_available ? `Stock: ${product.stock_quantity}` : "Unavailable"}
                  </span>
                </div>
                {product.category && <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{product.category}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{editingProduct ? "Edit Product" : "New Product"}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none" placeholder="Product description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Price (BDT) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Sale Price</label>
                  <input type="number" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Category</label>
                  <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Clothing" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Stock Quantity</label>
                  <input type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Product Images (URLs)</label>
                <div className="space-y-2">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" value={url} placeholder="https://example.com/image.jpg"
                        onChange={e => {
                          const newImages = [...form.images];
                          newImages[idx] = e.target.value;
                          setForm({...form, images: newImages});
                        }}
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                      {url && (
                        <img src={url} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      {form.images.length > 1 && (
                        <button type="button" onClick={() => {
                          const newImages = form.images.filter((_, i) => i !== idx);
                          setForm({...form, images: newImages});
                        }} className="p-1 text-red-400 hover:text-red-300 transition-colors">
                          <XCircle size={18} weight="duotone" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({...form, images: [...form.images, ""]})}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <PlusCircle size={16} weight="duotone" /> Add another image
                  </button>
                </div>
              </div>
              {/* Variants / Sizes */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Variants / Sizes (optional)</label>
                <div className="space-y-2">
                  {form.variants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" value={v.name} placeholder="e.g. 200 ml"
                        onChange={e => {
                          const nv = [...form.variants];
                          nv[idx] = {...nv[idx], name: e.target.value};
                          setForm({...form, variants: nv});
                        }}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                      <input type="number" value={v.price} placeholder="Price"
                        onChange={e => {
                          const nv = [...form.variants];
                          nv[idx] = {...nv[idx], price: e.target.value};
                          setForm({...form, variants: nv});
                        }}
                        className="w-28 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500" />
                      <button type="button" onClick={() => {
                        setForm({...form, variants: form.variants.filter((_, i) => i !== idx)});
                      }} className="p-1 text-red-400 hover:text-red-300 transition-colors">
                        <XCircle size={18} weight="duotone" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({...form, variants: [...form.variants, {name: "", price: ""}]})}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <PlusCircle size={16} weight="duotone" /> Add variant
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm({...form, is_available: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-500" />
                <label className="text-sm text-slate-300">Available for sale</label>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Spinner size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
                  {editingProduct ? "Update" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
