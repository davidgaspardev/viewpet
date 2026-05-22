"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/ui/Logo";

export function StickyHeader() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setVisible(true);
      } else if (currentScrollY < lastScrollY.current) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY.current + 4) {
        setVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center gap-2.5 px-6">
          <Logo className="h-7 w-7 text-ink" />
          <span className="text-base font-bold tracking-tight text-ink">View Pet</span>
        </div>
      </div>
    </header>
  );
}
