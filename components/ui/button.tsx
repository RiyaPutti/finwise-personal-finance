import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet"; size?: "sm" | "md" | "lg" | "icon"; };
export const Button = forwardRef<HTMLButtonElement, Props>(({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]", {
    "bg-[var(--accent)] text-[#151108] hover:brightness-110 shadow-[0_8px_20px_rgba(208,170,97,.20)]": variant === "primary",
    "bg-[var(--raised)] text-[var(--ink)] hover:bg-[var(--raised-hover)]": variant === "secondary",
    "text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--ink)]": variant === "ghost",
    "bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25": variant === "danger",
    "border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--raised)]": variant === "quiet",
    "h-8 px-3 text-xs": size === "sm", "h-10 px-4 text-sm": size === "md", "h-12 px-5 text-base": size === "lg", "h-10 w-10 p-0": size === "icon",
  }, className)} {...props} />
));
Button.displayName = "Button";
