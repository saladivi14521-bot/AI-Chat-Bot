import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("smartrep_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("smartrep_token");
      localStorage.removeItem("smartrep_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH
// ============================================
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateMe: (data: any) => api.put("/auth/me", data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/auth/change-password", data),
};

// ============================================
// BUSINESS
// ============================================
export const businessApi = {
  getMyBusiness: () => api.get("/business/me"),
  updateBusiness: (data: any) => api.put("/business/me", data),
  updateAISettings: (data: any) => api.put("/business/ai-settings", data),
  getSubscription: () => api.get("/business/subscription"),
  upgradeSubscription: (plan: string) =>
    api.post("/business/subscription/upgrade", { plan }),
};

// ============================================
// PRODUCTS
// ============================================
export const productsApi = {
  list: (params?: any) => api.get("/products", { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post("/products", data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  bulkDelete: (ids: string[]) => api.post("/products/bulk-delete", { ids }),
  generateDescription: (id: string) =>
    api.post(`/products/${id}/generate-description`),
};

// ============================================
// KNOWLEDGE BASE
// ============================================
export const knowledgeBaseApi = {
  list: (params?: any) => api.get("/knowledge-base", { params }),
  get: (id: string) => api.get(`/knowledge-base/${id}`),
  create: (data: any) => api.post("/knowledge-base", data),
  update: (id: string, data: any) => api.put(`/knowledge-base/${id}`, data),
  delete: (id: string) => api.delete(`/knowledge-base/${id}`),
  bulkDelete: (ids: string[]) => api.post("/knowledge-base/bulk-delete", { ids }),
};

// ============================================
// CONVERSATIONS
// ============================================
export const conversationsApi = {
  list: (params?: any) => api.get("/conversations", { params }),
  get: (id: string) => api.get(`/conversations/${id}`),
  getMessages: (id: string, params?: any) =>
    api.get(`/conversations/${id}/messages`, { params }),
  sendMessage: (id: string, content: string) =>
    api.post(`/conversations/${id}/send`, { content }),
  takeover: (id: string, action: string) =>
    api.post(`/conversations/${id}/takeover`, { action }),
};

// ============================================
// CUSTOMERS
// ============================================
export const customersApi = {
  list: (params?: any) => api.get("/customers", { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
};

// ============================================
// ANALYTICS
// ============================================
export const analyticsApi = {
  getDashboard: (days?: number) =>
    api.get("/analytics/dashboard", { params: { days } }),
};

// ============================================
// ORDERS
// ============================================
export const ordersApi = {
  list: (params?: any) => api.get("/orders", { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post("/orders", data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
};

// ============================================
// INTEGRATIONS
// ============================================
export const integrationsApi = {
  getFacebookAuthUrl: () => api.get("/integrations/facebook/auth-url"),
  handleFacebookCallback: (code: string) =>
    api.post("/integrations/facebook/oauth-callback", null, { params: { code } }),
  connectFacebook: (data: any) => api.post("/integrations/facebook/connect", data),
  listFacebookPages: () => api.get("/integrations/facebook/pages"),
  disconnectFacebookPage: (id: string) =>
    api.delete(`/integrations/facebook/pages/${id}`),
  // Page Monitor
  getMonitorSettings: () => api.get("/integrations/page-monitor/settings"),
  updateMonitorSettings: (data: {
    auto_comment_reply_enabled?: boolean;
    page_monitor_enabled?: boolean;
    page_sync_interval_minutes?: number;
  }) => api.put("/integrations/page-monitor/settings", data),
  syncPageContent: (pageId: string) =>
    api.post(`/integrations/page-monitor/sync/${pageId}`),
  getPageMonitorStats: (pageId: string) =>
    api.get(`/integrations/page-monitor/stats/${pageId}`),
  checkAndReplyComments: (pageId: string) =>
    api.post(`/integrations/page-monitor/check-comments/${pageId}`),
};

// ============================================
// SCRAPER / IMPORT
// ============================================
export const scraperApi = {
  scrapeWebsite: (data: { url: string; auto_add_products?: boolean; auto_add_kb?: boolean; max_pages?: number }) =>
    api.post("/scraper/website", data),
  scrapeProductPage: (data: { url: string }) =>
    api.post("/scraper/product-page", data),
  analyzePageContent: (data: { page_id: string }) =>
    api.post("/scraper/analyze-page", data),
};

// ============================================
// ADMIN
// ============================================
export const adminApi = {
  getDashboard: () => api.get("/admin/dashboard"),
  listUsers: (params?: any) => api.get("/admin/users", { params }),
  toggleUserActive: (id: string) =>
    api.post(`/admin/users/${id}/toggle-active`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
};

export default api;
