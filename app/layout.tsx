import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finwise — Personal finance",
  description: "A private personal finance workspace.",
  icons: {
    icon: [{ url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663823259361/REVWfUHGrNpbNMvi.png", type: "image/png" }],
    apple: [{ url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663823259361/wpDVRhsALSOOSMXW.png", type: "image/png", sizes: "192x192" }],
    other: [{ rel: "icon", url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663823259361/SuuwLgnYgazvsrkK.png", type: "image/png", sizes: "512x512" }],
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="dark" enableSystem>{children}<Toaster position="top-right" theme="dark" richColors /></ThemeProvider></body></html>; }
