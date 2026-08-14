"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const asset = {
  dark: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663823259361/mwmlZfWFtEHSUSTN.png",
  light: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663823259361/xRNqxYzLTGWnNnFq.png",
  monogram: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663823259361/yyOodUOnTdJgYWBI.png",
} as const;

type FinwiseLogoProps = {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
  variant?: "full" | "compact";
};

export function FinwiseMark({ className }: { className?: string }) {
  return <img src={asset.monogram} alt="" aria-hidden="true" className={cn("block shrink-0 object-contain", className)} />;
}

export function FinwiseLogo({ className, markClassName, variant = "full" }: FinwiseLogoProps) {
  const { resolvedTheme } = useTheme();
  if (variant === "compact") return <FinwiseMark className={cn("h-9 w-9", markClassName, className)} />;

  const logoSrc = resolvedTheme === "light" ? asset.light : asset.dark;
  return <img src={logoSrc} alt="Finwise" className={cn("finwise-logo block h-[46px] w-auto max-w-full object-contain", className)} />;
}
