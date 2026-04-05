"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";

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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-xl font-bold text-coral-500">
          Dispart
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 transition"
          >
            Discover
          </Link>
          <Link
            href="/schedule"
            className="text-gray-600 hover:text-gray-900 transition"
          >
            Schedule
          </Link>
          <Link
            href="/host/requests"
            className="text-gray-600 hover:text-gray-900 transition"
          >
            Host
          </Link>
          <Link
            href="/submit"
            className="text-gray-600 hover:text-gray-900 transition"
          >
            Submit
          </Link>

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/profile/communities"
                className="text-gray-600 hover:text-gray-900 transition text-xs"
              >
                Communities
              </Link>
              <Link
                href="/profile/preferences"
                className="text-gray-600 hover:text-gray-900 transition text-xs"
              >
                Preferences
              </Link>
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full bg-coral-100 text-coral-600 font-semibold text-xs flex items-center justify-center hover:bg-coral-200 transition"
              >
                {user.email?.[0]?.toUpperCase() || "U"}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-2 px-3 py-1.5 rounded-lg bg-coral-500 text-white text-xs font-medium hover:bg-coral-600 transition"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
