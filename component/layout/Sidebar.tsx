"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Boxes,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
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
      <div className="px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>

        <nav className="space-y-1">
          {menuItems.map((item) => {
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

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 w-full border-t border-slate-200 p-4">
        <Link
          href="/pengaturan"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Settings className="h-5 w-5" />
          Pengaturan
        </Link>

        <button
          type="button"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </button>
      </div>
    </aside>
  );
}