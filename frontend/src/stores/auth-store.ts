import { create } from "zustand";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
}

interface Business {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  industry?: string;
  currency: string;
  ai_personality: string;
  auto_reply_enabled: boolean;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  business: Business | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setBusiness: (business: Business) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  business: null,
  isLoading: true,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("smartrep_token", token);
      localStorage.setItem("smartrep_user", JSON.stringify(user));
    }
    set({ user, token, isLoading: false });
  },

  setBusiness: (business) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("smartrep_business", JSON.stringify(business));
    }
    set({ business });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("smartrep_token");
      localStorage.removeItem("smartrep_user");
      localStorage.removeItem("smartrep_business");
    }
    set({ user: null, token: null, business: null });
  },

  loadFromStorage: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("smartrep_token");
      const userStr = localStorage.getItem("smartrep_user");
      const bizStr = localStorage.getItem("smartrep_business");
      const user = userStr ? JSON.parse(userStr) : null;
      const business = bizStr ? JSON.parse(bizStr) : null;
      set({ user, token, business, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
}));
