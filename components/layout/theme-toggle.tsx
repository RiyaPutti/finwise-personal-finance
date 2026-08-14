"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
export function ThemeToggle() { const { resolvedTheme, setTheme } = useTheme(); const isDark = resolvedTheme !== "light"; return <button aria-label="Toggle colour theme" onClick={() => setTheme(isDark ? "light" : "dark")} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--ink)]">{isDark ? <Sun size={17} /> : <Moon size={17} />}</button>; }
