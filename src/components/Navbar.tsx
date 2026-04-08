"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const supabase = createClient();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/profile") {
      return pathname === "/profile" || pathname.startsWith("/profiles/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function navLinkClass(href: string, emphasis = false) {
    const active = isActive(href);

    if (active) {
      return emphasis
        ? "gradient-cta rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgb(160,58,15,0.18)]"
        : "rounded-full bg-coral-100 px-4 py-2.5 text-sm font-bold text-coral-700 shadow-[0_10px_24px_rgb(160,58,15,0.08)]";
    }

    return emphasis
      ? "rounded-full px-4 py-2.5 text-sm font-bold text-coral-900/70 hover:bg-coral-100 hover:text-coral-600"
      : "rounded-full px-3 py-2 text-sm font-semibold text-coral-900/70 hover:bg-coral-100 hover:text-coral-600";
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="glass-nav mx-auto mt-3 flex h-16 w-[min(1120px,calc(100%-1rem))] items-center justify-between rounded-[28px] px-4 ambient-shadow">
        <Link
          href="/"
          className="display-font text-2xl font-extrabold tracking-tight text-coral-500"
        >
          Dispart
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link href="/" className={navLinkClass("/")}>
            Recommended
          </Link>
          <Link href="/schedule" className={navLinkClass("/schedule")}>
            Schedule
          </Link>
          <Link href="/host/requests" className={navLinkClass("/host/requests")}>
            Host
          </Link>
          <Link href="/create" className={navLinkClass("/create", true)}>
            Create
          </Link>

          {user ? (
            <div className="ml-1 flex items-center gap-2">
              <Link
                href="/profile"
                className={`hidden text-xs font-bold uppercase tracking-[0.16em] md:inline-flex ${isActive("/profile") ? "rounded-full bg-coral-100 px-4 py-2 text-coral-700 shadow-[0_10px_24px_rgb(160,58,15,0.08)]" : "rounded-full px-3 py-2 text-coral-900/55 hover:bg-coral-100 hover:text-coral-600"}`}
              >
                Profile
              </Link>
              <Link
                href="/profile/preferences"
                className={`hidden text-xs font-bold uppercase tracking-[0.16em] lg:inline-flex ${isActive("/profile/preferences") ? "rounded-full bg-coral-100 px-4 py-2 text-coral-700 shadow-[0_10px_24px_rgb(160,58,15,0.08)]" : "rounded-full px-3 py-2 text-coral-900/55 hover:bg-coral-100 hover:text-coral-600"}`}
              >
                Preferences
              </Link>
              <NotificationBell />
              <button
                onClick={handleSignOut}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-250 text-xs font-bold text-coral-600 hover:bg-coral-300"
              >
                {user.email?.[0]?.toUpperCase() || "U"}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-full bg-coral-250 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-600 hover:bg-coral-300"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
