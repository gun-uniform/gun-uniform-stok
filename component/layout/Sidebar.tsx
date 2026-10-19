
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  FileText,
  Settings,
  LogOut,
  Boxes,
} from "lucide-react";
import api from "@/lib/api";

type UserRole = "admin" | "pimpinan" | "gudang";

type MenuItem = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Akun",
    href: "/akun",
    icon: Settings,
  },
  {
    title: "Stok Barang",
    href: "/stok-barang",
    icon: Package,
  },
  {
    title: "Barang Masuk",
    href: "/barang-masuk",
    icon: PackagePlus,
  },
  {
    title: "Barang Keluar",
    href: "/barang-keluar",
    icon: PackageMinus,
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: FileText,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [role, setRole] = useState<UserRole | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const user = JSON.parse(storedUser);
        const userRole = String(user.role ?? "").toLowerCase();

        if (
          userRole === "admin" ||
          userRole === "pimpinan" ||
          userRole === "gudang"
        ) {
          setRole(userRole);
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error("Gagal membaca data user:", error);
      setRole(null);
    }
  }, []);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.href === "/akun") {
      return role === "admin" || role === "pimpinan";
    }

    return true;
  });

  const handleLogout = () => {
    if (loggingOut) return;

    setLoggingOut(true);

    // Kirim permintaan logout ke backend tanpa menunggu responsnya.
    // Jika gagal, sesi lokal tetap dihapus.
    void api.post("/logout").catch((error) => {
      console.error("Permintaan logout gagal:", error);
    });

    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      // Navigasi penuh agar halaman login dimuat ulang.
      window.location.replace("/login");
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
          <Boxes className="h-6 w-6 text-white" />
        </div>

        <div>
          <h1 className="text-base font-bold text-slate-900">
            StockFlow
          </h1>
          <p className="text-xs text-slate-500">
            Inventory System
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>

        <nav className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Keluar */}
      <div className="shrink-0 border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-5 w-5" />
          <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
        </button>
      </div>
    </aside>
  );
}
