"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  PackageCheck,
  PackageMinus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

import DashboardLayout from "@/component/layout/DashboardLayout";
import api from "@/lib/api";

/* ============================================================
   INTERFACE
   ============================================================ */

interface Barang {
  id: number;
  kode_barang: string;
  nama_barang: string;
  detail_ukuran?: string | null;

  satuan_masuk: string;
  isi_per_satuan?: number | null;
  satuan_keluar: string;

  stok_minimum: number;
}

interface BarangMasuk {
  id: number;
  barang_id: number;
  jumlah: number;
  satuan: string;
  jumlah_dasar: number;
  tanggal: string;
  barang?: Barang;
}

interface BarangKeluar {
  id: number;
  barang_id: number;
  jumlah: number;
  satuan: string;
  jumlah_dasar: number;
  tanggal: string;
  barang?: Barang;
}

interface StokBarang {
  id: number;
  kode_barang: string;
  nama_barang: string;
  detail: string;

  satuan_masuk: string;
  satuan_keluar: string;
  isi_per_satuan: number | null;

  total_masuk: number;
  total_keluar: number;
  sisa_stok: number;

  stok_minimum: number;
  status_stok: string;
}

interface Activity {
  id: string;
  type: "masuk" | "keluar";
  nama_barang: string;
  jumlah: number;
  satuan: string;
  tanggal: string;
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function DashboardPage() {
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [barangMasuk, setBarangMasuk] = useState<BarangMasuk[]>([]);
  const [barangKeluar, setBarangKeluar] = useState<BarangKeluar[]>([]);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     AMBIL DATA DASHBOARD
     ============================================================ */

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [
          barangResponse,
          masukResponse,
          keluarResponse,
        ] = await Promise.all([
          api.get("/barang"),
          api.get("/barang-masuk"),
          api.get("/barang-keluar"),
        ]);

        setBarangs(
          Array.isArray(barangResponse.data)
            ? barangResponse.data
            : barangResponse.data.data || []
        );

        setBarangMasuk(
          Array.isArray(masukResponse.data)
            ? masukResponse.data
            : masukResponse.data.data || []
        );

        setBarangKeluar(
          Array.isArray(keluarResponse.data)
            ? keluarResponse.data
            : keluarResponse.data.data || []
        );
      } catch (error) {
        console.error(
          "Gagal mengambil data dashboard:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  /* ============================================================
     HITUNG TOTAL STOK SETIAP BARANG
     ============================================================ */

  const stokBarang: StokBarang[] = useMemo(() => {
    return barangs.map((barang) => {
      /*
       * Stok menggunakan jumlah_dasar.
       *
       * Contoh:
       * 5 Pack Topi x 25 = 125 PCS
       *
       * jumlah_dasar masuk = 125
       */

      const totalMasuk = barangMasuk
        .filter(
          (item) =>
            Number(item.barang_id) === Number(barang.id)
        )
        .reduce(
          (total, item) =>
            total + Number(item.jumlah_dasar || 0),
          0
        );

      const totalKeluar = barangKeluar
        .filter(
          (item) =>
            Number(item.barang_id) === Number(barang.id)
        )
        .reduce(
          (total, item) =>
            total + Number(item.jumlah_dasar || 0),
          0
        );

      const sisaStok = totalMasuk - totalKeluar;

      /*
       * Status stok menggunakan stok_minimum
       * dari master barang.
       */

      const stokMinimum = Number(
        barang.stok_minimum || 0
      );

      let statusStok = "Aman";

      if (sisaStok <= 0) {
        statusStok = "Habis";
      } else if (sisaStok <= stokMinimum) {
        statusStok = "Menipis";
      }

      return {
        id: barang.id,
        kode_barang: barang.kode_barang,
        nama_barang: barang.nama_barang,
        detail: barang.detail_ukuran || "-",

        satuan_masuk: barang.satuan_masuk,
        satuan_keluar: barang.satuan_keluar,
        isi_per_satuan:
          barang.isi_per_satuan ?? null,

        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        sisa_stok: sisaStok,

        stok_minimum: stokMinimum,
        status_stok: statusStok,
      };
    });
  }, [barangs, barangMasuk, barangKeluar]);

  /* ============================================================
     STATISTIK DASHBOARD
     ============================================================ */

  const totalBarang = stokBarang.length;

  const totalStok = stokBarang.reduce(
    (total, item) =>
      total + item.sisa_stok,
    0
  );

  const bulanSekarang = new Date().getMonth();
  const tahunSekarang = new Date().getFullYear();

  /*
   * Barang masuk bulan ini.
   *
   * Tetap menggunakan jumlah_dasar karena
   * statistik stok harus konsisten dengan sistem stok.
   */

  const barangMasukBulanIni = barangMasuk
    .filter((item) => {
      const tanggal = new Date(item.tanggal);

      return (
        tanggal.getMonth() === bulanSekarang &&
        tanggal.getFullYear() === tahunSekarang
      );
    })
    .reduce(
      (total, item) =>
        total + Number(item.jumlah_dasar || 0),
      0
    );

  /*
   * Barang keluar bulan ini.
   */

  const barangKeluarBulanIni = barangKeluar
    .filter((item) => {
      const tanggal = new Date(item.tanggal);

      return (
        tanggal.getMonth() === bulanSekarang &&
        tanggal.getFullYear() === tahunSekarang
      );
    })
    .reduce(
      (total, item) =>
        total + Number(item.jumlah_dasar || 0),
      0
    );

  /* ============================================================
     BARANG STOK MENIPIS
     ============================================================ */

  const lowStockItems = stokBarang
    .filter(
      (item) =>
        item.status_stok === "Menipis" ||
        item.status_stok === "Habis"
    )
    .sort(
      (a, b) =>
        a.sisa_stok - b.sisa_stok
    );

  /* ============================================================
     AKTIVITAS TERBARU
     ============================================================ */

  const activities: Activity[] = useMemo(() => {
    /*
     * Untuk aktivitas, kita tetap tampilkan jumlah transaksi asli.
     *
     * Contoh:
     * Barang masuk = 5 Pack
     *
     * Dashboard menampilkan:
     * +5 Pack
     *
     * Bukan:
     * +125 PCS
     */

    const masukActivities: Activity[] =
      barangMasuk.map((item) => {
        const barang =
          item.barang ||
          barangs.find(
            (barang) =>
              Number(barang.id) ===
              Number(item.barang_id)
          );

        return {
          id: `masuk-${item.id}`,
          type: "masuk",

          nama_barang:
            barang?.nama_barang ||
            "Barang",

          jumlah:
            Number(item.jumlah || 0),

          satuan:
            item.satuan ||
            barang?.satuan_masuk ||
            "",

          tanggal: item.tanggal,
        };
      });

    const keluarActivities: Activity[] =
      barangKeluar.map((item) => {
        const barang =
          item.barang ||
          barangs.find(
            (barang) =>
              Number(barang.id) ===
              Number(item.barang_id)
          );

        return {
          id: `keluar-${item.id}`,
          type: "keluar",

          nama_barang:
            barang?.nama_barang ||
            "Barang",

          jumlah:
            Number(item.jumlah || 0),

          satuan:
            item.satuan ||
            barang?.satuan_keluar ||
            "",

          tanggal: item.tanggal,
        };
      });

    return [
      ...masukActivities,
      ...keluarActivities,
    ]
      .sort(
        (a, b) =>
          new Date(b.tanggal).getTime() -
          new Date(a.tanggal).getTime()
      )
      .slice(0, 5);
  }, [
    barangMasuk,
    barangKeluar,
    barangs,
  ]);

  /* ============================================================
     FORMAT ANGKA
     ============================================================ */

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat("id-ID").format(
      number
    );
  };

  /* ============================================================
     FORMAT TANGGAL
     ============================================================ */

  const formatDate = (date: string) => {
    const tanggal = new Date(date);

    return tanggal.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <DashboardLayout>
      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Ringkasan informasi stok barang saat ini.
        </p>
      </div>

      {/* Loading */}

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />

            <span>
              Memuat data dashboard...
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* =====================================================
              STATISTICS
          ====================================================== */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* Total Barang */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <Package className="h-5 w-5 text-slate-700" />
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">
                  Total Barang
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-900">
                  {formatNumber(totalBarang)}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Jenis barang
                </p>
              </div>
            </div>

            {/* Total Stok */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <PackageCheck className="h-5 w-5 text-slate-700" />
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">
                  Total Stok
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-900">
                  {formatNumber(totalStok)}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Total stok dalam satuan dasar
                </p>
              </div>
            </div>

            {/* Barang Masuk */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                  <PackageCheck className="h-5 w-5 text-green-600" />
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />

                  Masuk
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">
                  Barang Masuk
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-900">
                  {formatNumber(
                    barangMasukBulanIni
                  )}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Satuan dasar bulan ini
                </p>
              </div>
            </div>

            {/* Barang Keluar */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                  <PackageMinus className="h-5 w-5 text-red-500" />
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                  <ArrowDownRight className="h-3.5 w-3.5" />

                  Keluar
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-slate-500">
                  Barang Keluar
                </p>

                <h2 className="mt-1 text-3xl font-bold text-slate-900">
                  {formatNumber(
                    barangKeluarBulanIni
                  )}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Satuan dasar bulan ini
                </p>
              </div>
            </div>
          </div>

          {/* =====================================================
              CONTENT
          ====================================================== */}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Low Stock */}

            <div className="rounded-2xl border border-slate-200 bg-white xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Stok Menipis
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Barang yang perlu segera di-restock
                  </p>
                </div>

                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>

              <div className="overflow-x-auto">
                {lowStockItems.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <PackageCheck className="mx-auto h-8 w-8 text-green-500" />

                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Semua stok aman
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Tidak ada barang yang perlu di-restock.
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4 font-medium">
                          Kode
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Nama Barang
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Detail
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Stok
                        </th>

                        <th className="px-6 py-4 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {lowStockItems.map(
                        (item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">
                              {item.kode_barang}
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-700">
                              {item.nama_barang}
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-500">
                              {item.detail}
                            </td>

                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                              {formatNumber(
                                item.sisa_stok
                              )}{" "}
                              {item.satuan_keluar}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.status_stok ===
                                  "Habis"
                                    ? "bg-red-50 text-red-600"
                                    : "bg-orange-50 text-orange-600"
                                }`}
                              >
                                {item.status_stok}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Activity */}

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-semibold text-slate-900">
                  Aktivitas Terbaru
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Aktivitas stok terakhir
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {activities.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-3 text-sm text-slate-500">
                      Belum ada aktivitas.
                    </p>
                  </div>
                ) : (
                  activities.map(
                    (activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-3 px-6 py-4"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            activity.type ===
                            "masuk"
                              ? "bg-green-50"
                              : "bg-red-50"
                          }`}
                        >
                          {activity.type ===
                          "masuk" ? (
                            <PackageCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <PackageMinus className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">
                            {activity.type ===
                            "masuk"
                              ? "Barang masuk"
                              : "Barang keluar"}
                          </p>

                          <p className="truncate text-xs text-slate-400">
                            {activity.nama_barang}{" "}
                            •{" "}
                            {activity.type ===
                            "masuk"
                              ? "+"
                              : "-"}
                            {formatNumber(
                              activity.jumlah
                            )}{" "}
                            {activity.satuan}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatDate(
                              activity.tanggal
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
