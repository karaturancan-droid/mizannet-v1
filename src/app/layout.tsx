import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MizanNet",
  description: "MizanNet - İşletme Yönetim Yazılımı",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.5); }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        `}} />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('contextmenu', function(e) {
              if (e.target.nodeName !== 'INPUT' && e.target.nodeName !== 'TEXTAREA') {
                e.preventDefault();
              }
            });`
          }}
        />
        <AuthProvider>
          <BranchProvider>
            <AppShell>{children}</AppShell>
          </BranchProvider>
        </AuthProvider>
      </body>

    </html>
  );
}
