import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "SENTINEL", template: "%s · SENTINEL" },
  description: "Memória operacional dos projetos.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#17181c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only z-[var(--z-toast)] rounded-md bg-accent px-3 py-2 text-body-sm text-fg-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
