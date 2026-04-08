"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
          <Link
            href="/"
            className="rounded-full px-3 py-2 text-sm font-semibold text-coral-900/70 hover:bg-coral-100 hover:text-coral-600"
          >
            Recommended
          </Link>
          <Link
            href="/schedule"
            className="rounded-full px-3 py-2 text-sm font-semibold text-coral-900/70 hover:bg-coral-100 hover:text-coral-600"
          >
            Schedule
          </Link>
          <Link
            href="/host/requests"
            className="rounded-full px-3 py-2 text-sm font-semibold text-coral-900/70 hover:bg-coral-100 hover:text-coral-600"
          >
            Host
          </Link>
          <Link
            href="/create"
            className="gradient-cta rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgb(160,58,15,0.18)] hover:-translate-y-0.5"
          >
            Create
          </Link>

          {user ? (
            <div className="ml-1 flex items-center gap-2">
              <Link
                href="/profile"
                className="hidden rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-900/55 hover:bg-coral-100 hover:text-coral-600 md:inline-flex"
              >
                Profile
              </Link>
              <Link
                href="/profile/preferences"
                className="hidden rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-900/55 hover:bg-coral-100 hover:text-coral-600 lg:inline-flex"
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
