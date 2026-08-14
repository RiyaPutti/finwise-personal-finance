import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = { title: "Finwise — Personal finance", description: "A private personal finance workspace." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="dark" enableSystem>{children}<Toaster position="top-right" theme="dark" richColors /></ThemeProvider></body></html>; }
