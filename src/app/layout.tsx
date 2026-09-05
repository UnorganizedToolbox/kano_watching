import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "LearnFlow",
  description: "Math Diagnostic & Learning Tool",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
    let theme = cookieStore.get('theme')?.value || 'theme-glass';
  if (!theme.startsWith('theme-')) {
    theme = 'theme-' + theme;
  }

  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={cn(
        "bg-slate-50 text-slate-800 dark:bg-darkbg-primary dark:text-slate-100",
        "transition-colors duration-200 min-h-screen flex flex-col font-sans overflow-hidden",
        theme
      )}>
        {children}
      </body>
    </html>
  );
}
