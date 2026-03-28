"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Spinner, CheckCircle, WarningCircle, FacebookLogo,
} from "@phosphor-icons/react";
import { integrationsApi } from "@/lib/api";

export default function FacebookCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting your Facebook Pages...");
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(
        error === "access_denied"
          ? "You cancelled the Facebook connection."
          : `Facebook error: ${searchParams.get("error_description") || error}`
      );
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from Facebook.");
      return;
    }

    // Exchange code for tokens and connect pages
    handleCallback(code);
  }, [searchParams]);

  const handleCallback = async (code: string) => {
    try {
      const res = await integrationsApi.handleFacebookCallback(code);
      const data = res.data;
      setPages(data.pages || []);
      if (data.pages_connected > 0) {
        setStatus("success");
        setMessage(data.message || `Connected ${data.pages_connected} page(s)!`);
      } else {
        setStatus("error");
        setMessage(data.message || "No pages found on your Facebook account.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.response?.data?.detail || "Failed to connect Facebook Pages. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
          <FacebookLogo size={36} weight="fill" className="text-blue-400" />
        </div>

        {/* Loading State */}
        {status === "loading" && (
          <>
            <Spinner size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connecting Facebook</h3>
            <p className="text-sm text-slate-400">{message}</p>
          </>
        )}

        {/* Success State */}
        {status === "success" && (
          <>
            <CheckCircle size={48} weight="duotone" className="text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Facebook Connected!</h3>
            <p className="text-sm text-slate-400 mb-4">{message}</p>

            {pages.length > 0 && (
              <div className="space-y-2 mb-6">
                {pages.map((page: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                    {page.picture_url ? (
                      <img src={page.picture_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <FacebookLogo size={16} weight="fill" className="text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{page.page_name}</p>
                      <p className="text-[10px] text-emerald-400 capitalize">{page.status}</p>
                    </div>
                    <CheckCircle size={18} className="text-emerald-400" />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push("/dashboard/integrations")}
              className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Go to Integrations
            </button>
          </>
        )}

        {/* Error State */}
        {status === "error" && (
          <>
            <WarningCircle size={48} weight="duotone" className="text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Connection Failed</h3>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/dashboard/integrations")}
                className="px-5 py-2.5 border border-white/10 text-slate-300 text-sm font-medium rounded-xl hover:bg-white/5 transition-colors"
              >
                Back to Integrations
              </button>
              <button
                onClick={() => router.push("/dashboard/integrations")}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
