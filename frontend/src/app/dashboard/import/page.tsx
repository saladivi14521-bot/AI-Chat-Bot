"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GlobeSimple,
  MagnifyingGlass,
  Package,
  Brain,
  ArrowRight,
  CheckCircle,
  XCircle,
  SpinnerGap,
  Link as LinkIcon,
  Storefront,
  Tag,
  Image,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
  Lightning,
  Info,
  ShoppingBag,
  Question,
  FileText,
  Sparkle,
} from "@phosphor-icons/react";
import { scraperApi } from "@/lib/api";
import { toast } from "sonner";

interface ScrapedProduct {
  name: string;
  description: string;
  price: number;
  sale_price?: number;
  category: string;
  images: string[];
  tags: string[];
  is_combo?: boolean;
  combo_items?: string[];
}

interface ScrapedFAQ {
  question: string;
  answer: string;
}

interface ScrapedPolicy {
  title: string;
  content: string;
}

interface ScrapeResult {
  success: boolean;
  message: string;
  pages_scraped: number;
  products_found: number;
  products_added: number;
  kb_entries_added: number;
  offers_found: number;
  data: {
    products?: ScrapedProduct[];
    faqs?: ScrapedFAQ[];
    policies?: ScrapedPolicy[];
    general_info?: { title: string; content: string }[];
    business_info?: Record<string, string>;
  };
}

export default function WebsiteImportPage() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [productResult, setProductResult] = useState<any>(null);
  const [maxPages, setMaxPages] = useState(10);
  const [autoAddProducts, setAutoAddProducts] = useState(true);
  const [autoAddKB, setAutoAddKB] = useState(true);
  const [activeTab, setActiveTab] = useState<"website" | "product">("website");
  const [expandedSection, setExpandedSection] = useState<string | null>("products");

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await scraperApi.scrapeWebsite({
        url: websiteUrl.trim(),
        auto_add_products: autoAddProducts,
        auto_add_kb: autoAddKB,
        max_pages: maxPages,
      });
      setResult(res.data);
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to scrape website");
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeProduct = async () => {
    if (!productUrl.trim()) {
      toast.error("Please enter a product page URL");
      return;
    }
    setProductLoading(true);
    setProductResult(null);
    try {
      const res = await scraperApi.scrapeProductPage({ url: productUrl.trim() });
      setProductResult(res.data);
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to scrape product page");
    } finally {
      setProductLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <GlobeSimple size={28} weight="duotone" className="text-teal-400" />
          Website Import
        </h1>
        <p className="text-slate-400 mt-1">
          Auto-import products, FAQs, and business info from your website
        </p>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-2xl p-4 flex items-start gap-3"
      >
        <Sparkle size={24} weight="duotone" className="text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-teal-200 font-medium">AI-Powered Import</p>
          <p className="text-xs text-teal-300/60 mt-1">
            Our AI will automatically scan your website, find products with prices & images, extract FAQs,
            policies, and business info — then add everything to your Knowledge Base and Product catalog.
            Combo offers are also detected automatically!
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("website")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "website"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : "bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white"
          }`}
        >
          <GlobeSimple size={18} weight="duotone" />
          Full Website Scan
        </button>
        <button
          onClick={() => setActiveTab("product")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "product"
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white"
          }`}
        >
          <Package size={18} weight="duotone" />
          Single Product Page
        </button>
      </div>

      {/* Website Scan Tab */}
      <AnimatePresence mode="wait">
        {activeTab === "website" && (
          <motion.div
            key="website"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <MagnifyingGlass size={20} weight="duotone" className="text-teal-400" />
                Scan Your Website
              </h3>

              {/* URL Input */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourstore.com"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/20 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleScrapeWebsite()}
                  />
                </div>
                <button
                  onClick={handleScrapeWebsite}
                  disabled={loading || !websiteUrl.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <SpinnerGap size={18} className="animate-spin" />
                  ) : (
                    <ArrowsClockwise size={18} weight="bold" />
                  )}
                  {loading ? "Scanning..." : "Scan Website"}
                </button>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Max pages:</span>
                  <select
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500/50"
                  >
                    {[5, 10, 15, 20, 30].map((n) => (
                      <option key={n} value={n} className="bg-[#0F1629]">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddProducts}
                    onChange={(e) => setAutoAddProducts(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-teal-500 focus:ring-teal-500/20"
                  />
                  <span className="text-xs text-slate-400">Auto-add Products</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddKB}
                    onChange={(e) => setAutoAddKB(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-teal-500 focus:ring-teal-500/20"
                  />
                  <span className="text-xs text-slate-400">Auto-add to Knowledge Base</span>
                </label>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0F1629] border border-white/[0.06] rounded-2xl p-8 text-center"
              >
                <SpinnerGap size={48} className="text-teal-400 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Scanning website...</p>
                <p className="text-slate-400 text-sm mt-1">
                  AI is crawling pages, extracting products, FAQs, and business information
                </p>
                <div className="flex justify-center gap-6 mt-4">
                  {["Discovering pages...", "Extracting data...", "Processing with AI..."].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400/40 animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
                      {step}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Results */}
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Pages Scanned", value: result.pages_scraped, icon: GlobeSimple, color: "text-teal-400" },
                    { label: "Products Found", value: result.products_found, icon: Package, color: "text-amber-400" },
                    { label: "Products Added", value: result.products_added, icon: CheckCircle, color: "text-emerald-400" },
                    { label: "KB Entries Added", value: result.kb_entries_added, icon: Brain, color: "text-purple-400" },
                    { label: "Offers Found", value: result.offers_found, icon: Tag, color: "text-pink-400" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-[#0F1629] border border-white/[0.06] rounded-xl p-4 text-center"
                    >
                      <stat.icon size={24} weight="duotone" className={`${stat.color} mx-auto mb-2`} />
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Products Discovered */}
                {result.data.products && result.data.products.length > 0 && (
                  <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection("products")}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-white font-semibold flex items-center gap-2">
                        <Package size={20} weight="duotone" className="text-amber-400" />
                        Products Found ({result.data.products.length})
                      </span>
                      {expandedSection === "products" ? (
                        <CaretUp size={18} className="text-slate-400" />
                      ) : (
                        <CaretDown size={18} className="text-slate-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedSection === "products" && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 grid gap-3 max-h-96 overflow-y-auto">
                            {result.data.products.map((product, i) => (
                              <div
                                key={i}
                                className="bg-white/[0.02] rounded-xl p-4 flex items-start gap-4 border border-white/[0.04]"
                              >
                                {product.images?.[0] ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-16 h-16 rounded-lg object-cover bg-white/[0.05] flex-shrink-0"
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                    <Image size={24} className="text-slate-600" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-white font-medium text-sm truncate">
                                      {product.name}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {product.sale_price ? (
                                        <>
                                          <span className="text-xs text-slate-500 line-through">৳{product.price}</span>
                                          <span className="text-sm font-bold text-emerald-400">৳{product.sale_price}</span>
                                        </>
                                      ) : (
                                        <span className="text-sm font-bold text-white">৳{product.price}</span>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {product.category && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        {product.category}
                                      </span>
                                    )}
                                    {product.is_combo && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                        🎁 Combo Offer
                                      </span>
                                    )}
                                    {product.tags?.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-500"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <CheckCircle size={20} weight="fill" className="text-emerald-400 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* FAQs */}
                {result.data.faqs && result.data.faqs.length > 0 && (
                  <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection("faqs")}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-white font-semibold flex items-center gap-2">
                        <Question size={20} weight="duotone" className="text-cyan-400" />
                        FAQs Found ({result.data.faqs.length})
                      </span>
                      {expandedSection === "faqs" ? (
                        <CaretUp size={18} className="text-slate-400" />
                      ) : (
                        <CaretDown size={18} className="text-slate-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedSection === "faqs" && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 space-y-2 max-h-64 overflow-y-auto">
                            {result.data.faqs.map((faq, i) => (
                              <div key={i} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                                <p className="text-sm text-white font-medium">Q: {faq.question}</p>
                                <p className="text-xs text-slate-400 mt-1">A: {faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Policies */}
                {result.data.policies && result.data.policies.length > 0 && (
                  <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection("policies")}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-white font-semibold flex items-center gap-2">
                        <FileText size={20} weight="duotone" className="text-purple-400" />
                        Policies Found ({result.data.policies.length})
                      </span>
                      {expandedSection === "policies" ? (
                        <CaretUp size={18} className="text-slate-400" />
                      ) : (
                        <CaretDown size={18} className="text-slate-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedSection === "policies" && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 space-y-2 max-h-64 overflow-y-auto">
                            {result.data.policies.map((policy, i) => (
                              <div key={i} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                                <p className="text-sm text-white font-medium">{policy.title}</p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-3">{policy.content}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Business Info */}
                {result.data.business_info && Object.keys(result.data.business_info).length > 0 && (
                  <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection("business")}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-white font-semibold flex items-center gap-2">
                        <Storefront size={20} weight="duotone" className="text-blue-400" />
                        Business Info Detected
                      </span>
                      {expandedSection === "business" ? (
                        <CaretUp size={18} className="text-slate-400" />
                      ) : (
                        <CaretDown size={18} className="text-slate-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedSection === "business" && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 grid grid-cols-2 gap-3">
                            {Object.entries(result.data.business_info).map(([key, value]) => (
                              <div key={key} className="bg-white/[0.02] rounded-lg p-3">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{key}</p>
                                <p className="text-sm text-white mt-0.5">{value}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Single Product Tab */}
        {activeTab === "product" && (
          <motion.div
            key="product"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Package size={20} weight="duotone" className="text-indigo-400" />
                Import Single Product
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Paste a direct product page URL to quickly add it to your catalog. Works with most e-commerce sites.
              </p>

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://yourstore.com/products/example-product"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && !productLoading && handleScrapeProduct()}
                  />
                </div>
                <button
                  onClick={handleScrapeProduct}
                  disabled={productLoading || !productUrl.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {productLoading ? (
                    <SpinnerGap size={18} className="animate-spin" />
                  ) : (
                    <ArrowRight size={18} weight="bold" />
                  )}
                  {productLoading ? "Importing..." : "Import Product"}
                </button>
              </div>
            </div>

            {/* Product Loading */}
            {productLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0F1629] border border-white/[0.06] rounded-2xl p-8 text-center"
              >
                <SpinnerGap size={48} className="text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Extracting product info...</p>
                <p className="text-slate-400 text-sm mt-1">
                  AI is reading the product page and extracting all details
                </p>
              </motion.div>
            )}

            {/* Product Result */}
            {productResult && !productLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0F1629] border border-white/[0.06] rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle size={32} weight="fill" className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-lg">{productResult.message}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Product has been added to your catalog and Knowledge Base.
                    </p>
                    {productResult.data && (
                      <div className="mt-4 bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                        <div className="flex items-start gap-3">
                          {productResult.data.images?.[0] && (
                            <img
                              src={productResult.data.images[0]}
                              alt=""
                              className="w-20 h-20 rounded-lg object-cover"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          )}
                          <div>
                            <h4 className="text-white font-medium">{productResult.data.name}</h4>
                            <p className="text-lg font-bold text-emerald-400 mt-1">
                              ৳{productResult.data.price}
                              {productResult.data.sale_price && (
                                <span className="text-xs text-slate-500 line-through ml-2">
                                  ৳{productResult.data.sale_price}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {productResult.data.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tips */}
            <div className="bg-[#0F1629] border border-white/[0.06] rounded-2xl p-6">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Lightning size={18} weight="duotone" className="text-amber-400" />
                Tips for Best Results
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">•</span>
                  Use the <strong className="text-slate-300">Full Website Scan</strong> to import all products at once from your store
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">•</span>
                  Use <strong className="text-slate-300">Single Product</strong> to quickly add individual products by URL
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">•</span>
                  Works with most e-commerce platforms: Shopify, WooCommerce, Daraz, custom sites
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">•</span>
                  Combo offers and sale prices are automatically detected and imported
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">•</span>
                  Duplicate products are skipped automatically
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
