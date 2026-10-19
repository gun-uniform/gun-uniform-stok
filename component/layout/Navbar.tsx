"use client";

import { useEffect, useState } from "react";
import { Bell, Search, UserCircle } from "lucide-react";

interface UserLogin {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
}

const formatRole = (role: string) => {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function Navbar() {
  const [user, setUser] = useState<UserLogin | null>(null);

  useEffect(() => {
    const loadUser = () => {
      try {
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Gagal membaca data user:", error);
      }
    };

    loadUser();

    // Memperbarui jika data user berubah di tab lain.
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-20 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between px-8">
        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Cari barang..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-base text-black outline-none transition placeholder:text-slate-500 focus:border-slate-400 focus:bg-white"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-5">
          {/* Notification */}
          <button
            type="button"
            aria-label="Notifikasi"
            className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User yang sedang login */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-5">
            <UserCircle className="h-10 w-10 shrink-0 text-slate-500" />

            <div className="max-w-56">
              <p className="truncate text-base font-semibold text-black">
                {user?.name || "Memuat akun..."}
              </p>

              <p className="truncate text-sm text-slate-600">
                {user?.role ? formatRole(user.role) : "Pengguna"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}