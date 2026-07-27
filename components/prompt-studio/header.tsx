"use client";

import { SignInWithChatGPT } from "@openai-oauth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useDailyPromptCount } from "@/lib/use-daily-prompt-count";

interface HeaderProps {
  activeStudio?: "prompt" | "poster";
}

export function Header({ activeStudio = "prompt" }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  // Read straight from the shared counter so every studio shows one combined
  // total — poster concepts, GPT-5.6 Sol prompts and Gemini prompts alike.
  const { count: dailyPromptCount } = useDailyPromptCount();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
      style={{
        background: scrolled ? "rgba(18, 18, 18, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #222" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-1 group" aria-label="Multia Prompt Studio home">
          <span className="font-display text-2xl tracking-tight text-white transition-all duration-300">
            Multia
          </span>
          <span className="text-[10px] text-white/40 font-body tracking-widest uppercase">
            .in
          </span>
        </Link>

        {/* Studio switcher */}
        <nav
          className="hidden md:flex items-center rounded-full border border-white/10 bg-black/20 p-1"
          aria-label="Studio navigation"
        >
          <Link
            href="/"
            aria-current={activeStudio === "prompt" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-body uppercase tracking-[0.14em] transition ${
              activeStudio === "prompt" ? "bg-white text-[#121212]" : "text-white/45 hover:text-white"
            }`}
          >
            Prompt
          </Link>
          <Link
            href="/poster-design"
            aria-current={activeStudio === "poster" ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-body uppercase tracking-[0.14em] transition ${
              activeStudio === "poster" ? "bg-white text-[#121212]" : "text-white/45 hover:text-white"
            }`}
          >
            Poster
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* The package ships its own light-theme inline styles, so scale it down
              to sit in the dark header without fighting its internals. */}
          <SignInWithChatGPT
            hideAttribution
            style={{
              minHeight: "34px",
              minWidth: "auto",
              padding: "0 14px",
              fontSize: "12px",
              borderRadius: "999px",
            }}
          />
          <Link
            href={activeStudio === "poster" ? "/" : "/poster-design"}
            className="md:hidden text-[10px] text-white/60 uppercase tracking-wider"
          >
            {activeStudio === "poster" ? "Prompt" : "Poster"}
          </Link>
          <div
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 sm:px-3 py-1.5"
            title="Prompts generated today across the Prompt Studio and Poster Studio"
          >
            <span className="text-[10px] text-white/35 font-body uppercase tracking-[0.18em]">
              Today
            </span>
            <span className="font-display text-sm text-white tabular-nums">
              {dailyPromptCount ?? "--"}
            </span>
          </div>
          <a
            href="https://multia.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white transition-colors font-body uppercase tracking-wider"
          >
            Agency
          </a>
        </div>
      </div>
    </header>
  );
}
