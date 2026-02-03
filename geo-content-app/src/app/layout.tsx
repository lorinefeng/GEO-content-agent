import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import MainLayout from "@/components/layout/MainLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import 'highlight.js/styles/github.css';

export const metadata: Metadata = {
  title: "GEO Content - 内容生成工作台",
  description: "AI驱动的多策略商品内容生成工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AntdRegistry>
            <MainLayout>{children}</MainLayout>
          </AntdRegistry>
        </ThemeProvider>
      </body>
    </html>
  );
}
