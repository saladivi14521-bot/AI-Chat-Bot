import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SmartRep AI - Your AI-Powered Business Representative",
  description:
    "Automate your Facebook & WhatsApp customer conversations with AI. SmartRep AI handles sales, support, and order taking in Bangla, Banglish, English & Hindi.",
  keywords: [
    "AI chatbot",
    "Facebook automation",
    "F-commerce",
    "WhatsApp bot",
    "sales automation",
    "Bangladesh",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(222.2 84% 8%)",
              border: "1px solid hsl(217.2 32.6% 17.5%)",
              color: "hsl(210 40% 98%)",
            },
          }}
        />
      </body>
    </html>
  );
}
