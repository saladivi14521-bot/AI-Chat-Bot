"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Spinner, X, MagnifyingGlass, Eye,
} from "@phosphor-icons/react";
import { ordersApi } from "@/lib/api";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total: number;
  currency: string;
  customer_name?: string;
  delivery_address?: string;
  delivery_phone?: string;
  payment_method?: string;
  payment_status: string;
  ai_extracted: boolean;
  items: { id: string; product_name: string; quantity: number; unit_price: number; total_price: number }[];
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  confirmed: "bg-blue-500/10 text-blue-400",
  processing: "bg-indigo-500/10 text-indigo-400",
  shipped: "bg-purple-500/10 text-purple-400",
  delivered: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => { loadOrders(); }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const res = await ordersApi.list(params);
      setOrders(res.data.items || []);
    } catch { }
    finally { setLoading(false); }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.update(orderId, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch { toast.error("Failed to update order"); }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-white">Orders</h2>
        <p className="text-sm text-slate-400 mt-1">{orders.length} orders</p>
      </motion.div>

      <div className="flex items-center gap-3 flex-wrap">
        {["", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${statusFilter === s ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Spinner size={32} className="text-indigo-400 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <ShoppingCart size={48} weight="duotone" className="text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Orders Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Orders will appear here when customers place them through conversations, or you can create them manually.
          </p>
        </motion.div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Order</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Total</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Payment</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-white">{order.order_number}</div>
                    {order.ai_extracted && <span className="text-[10px] text-indigo-400">🤖 AI Extracted</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-300">{order.customer_name || "—"}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-white">৳{order.total.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status] || "bg-slate-500/10 text-slate-400"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs ${order.payment_status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => setSelectedOrder(order)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Order {selectedOrder.order_number}</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                {selectedOrder.customer_name && <InfoRow label="Customer" value={selectedOrder.customer_name} />}
                {selectedOrder.delivery_phone && <InfoRow label="Phone" value={selectedOrder.delivery_phone} />}
                {selectedOrder.delivery_address && <InfoRow label="Address" value={selectedOrder.delivery_address} />}
                {selectedOrder.payment_method && <InfoRow label="Payment" value={selectedOrder.payment_method} />}
              </div>
              <div className="border-t border-white/[0.06] pt-3">
                <h4 className="text-sm font-medium text-white mb-2">Items</h4>
                {selectedOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span className="text-slate-300">{item.product_name} × {item.quantity}</span>
                    <span className="text-white">৳{item.total_price.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-white/[0.06] mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-white">৳{selectedOrder.subtotal.toLocaleString()}</span></div>
                  {selectedOrder.discount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Discount</span><span className="text-red-400">-৳{selectedOrder.discount.toLocaleString()}</span></div>}
                  {selectedOrder.delivery_charge > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Delivery</span><span className="text-white">৳{selectedOrder.delivery_charge.toLocaleString()}</span></div>}
                  <div className="flex justify-between text-base font-bold"><span className="text-white">Total</span><span className="text-white">৳{selectedOrder.total.toLocaleString()}</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Update Status</label>
                <select value={selectedOrder.status} onChange={e => updateStatus(selectedOrder.id, e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
