
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataView - 数据可视化平台",
  description: "专业的数据浏览与可视化平台，支持多种图表类型和实时数据更新",
  keywords: ["数据可视化", "图表", "数据分析", "dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
