import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

/**
 * 根布局 — 仅处理 html/body 标签和字体加载。
 * 语言/header/footer 在 [locale]/layout.tsx 中处理。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={cn("font-sans", inter.variable)} lang="zh">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
