"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import AppSidebar from "@/component/layout/Sidebar";
import AppNavbar from "@/component/layout/Navbar";
import api from "@/lib/api";

interface StokBarang {
  id: number;
  kode_barang: string;
  nama_barang: string;
  detail_ukuran: string | null;

  satuan_masuk: string;
  isi_per_satuan: number | null;
  satuan_keluar: string;

  stok_minimum: number;
  total_masuk: number;
  total_keluar: number;
  sisa_stok: number;

  status_stok: "Aman" | "Menipis" | "Habis";
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("id-ID").format(value);
};

const formatKodeBarang = (kode: string, id: number) => {
  if (kode && kode.trim() !== "") {
    return kode;
  }

  return `BRG-${String(id).padStart(4, "0")}`;
};

export default function StokBarangPage() {
  const [dataStok, setDataStok] = useState<StokBarang[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  /*
   * ============================================================
   * AMBIL DATA STOK
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false;

    const loadDataStok = async () => {
      try {
        setLoading(true);

        const response = await api.get("/barang");

        const responseData = response.data?.data ?? response.data;

        if (!cancelled) {
          setDataStok(
            Array.isArray(responseData) ? responseData : []
          );
        }
      } catch (error) {
        console.error(
          "Gagal mengambil data stok barang:",
          error
        );

        if (!cancelled) {
          setDataStok([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDataStok();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ============================================================
   * FILTER PENCARIAN
   * ============================================================
   */
  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) {
      return dataStok;
    }

    return dataStok.filter((barang) => {
      return (
        barang.kode_barang
          ?.toLowerCase()
          .includes(keyword) ||
        barang.nama_barang
          ?.toLowerCase()
          .includes(keyword) ||
        barang.detail_ukuran
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [dataStok, search]);

  /*
   * ============================================================
   * PAGINATION
   * ============================================================
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / itemsPerPage)
  );

  /*
   * Jika halaman saat ini lebih besar dari jumlah halaman
   * yang tersedia, gunakan halaman terakhir yang tersedia.
   */
  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safeCurrentPage - 1) * itemsPerPage;

  const currentData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  /*
   * ============================================================
   * SEARCH HANDLER
   * ============================================================
   */
  const handleSearchChange = (
    value: string
  ) => {
    setSearch(value);

    // Reset pagination langsung ketika user mencari
    setCurrentPage(1);
  };

  /*
   * ============================================================
   * PAGINATION HANDLER
   * ============================================================
   */
  const goToPreviousPage = () => {
    setCurrentPage((page) =>
      Math.max(page - 1, 1)
    );
  };

  const goToNextPage = () => {
    setCurrentPage((page) =>
      Math.min(page + 1, totalPages)
    );
  };

  /*
   * ============================================================
   * SUMMARY
   * ============================================================
   */
  const totalBarang = dataStok.length;

  const stokAman = dataStok.filter(
    (barang) =>
      barang.status_stok === "Aman"
  ).length;

  const stokMenipis = dataStok.filter(
    (barang) =>
      barang.status_stok === "Menipis"
  ).length;

  const stokHabis = dataStok.filter(
    (barang) =>
      barang.status_stok === "Habis"
  ).length;

  /*
   * ============================================================
   * STATUS BADGE
   * ============================================================
   */
  const renderStatus = (
    status: StokBarang["status_stok"]
  ) => {
    if (status === "Aman") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={14} />
          Aman
        </span>
      );
    }

    if (status === "Menipis") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <AlertTriangle size={14} />
          Menipis
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
        <XCircle size={14} />
        Habis
      </span>
    );
  };

  /*
   * ============================================================
   * KONVERSI SATUAN
   * ============================================================
   */
  const renderKonversi = (
    barang: StokBarang
  ) => {
    const satuanMasuk =
      barang.satuan_masuk?.toUpperCase();

    const satuanKeluar =
      barang.satuan_keluar?.toUpperCase();

    if (
      satuanMasuk &&
      satuanKeluar &&
      satuanMasuk !== satuanKeluar &&
      barang.isi_per_satuan
    ) {
      return (
        <div className="text-xs">
          <p className="font-medium text-slate-700">
            1 {barang.satuan_masuk}
          </p>

          <p className="text-slate-500">
            ={" "}
            {formatNumber(
              barang.isi_per_satuan
            )}{" "}
            {barang.satuan_keluar}
          </p>
        </div>
      );
    }

    return (
      <span className="text-xs font-medium text-slate-600">
        {barang.satuan_keluar}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />

      <div className="ml-64">
        <AppNavbar />

        <main className="px-8 pb-10 pt-28">
          {/* =====================================================
              HEADER
          ===================================================== */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Package size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Stok Barang
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Pantau jumlah stok barang berdasarkan
                  satuan stok.
                </p>
              </div>
            </div>
          </div>

          {/* =====================================================
              SUMMARY CARDS
          ===================================================== */}
          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* Total Barang */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Barang
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-slate-800">
                    {formatNumber(totalBarang)}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Jenis barang
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Package size={23} />
                </div>
              </div>
            </div>

            {/* Stok Aman */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Stok Aman
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-emerald-600">
                    {formatNumber(stokAman)}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Barang tersedia
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={23} />
                </div>
              </div>
            </div>

            {/* Stok Menipis */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Stok Menipis
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-amber-600">
                    {formatNumber(stokMenipis)}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Perlu diperhatikan
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle size={23} />
                </div>
              </div>
            </div>

            {/* Stok Habis */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Stok Habis
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-red-600">
                    {formatNumber(stokHabis)}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Segera lakukan pengadaan
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <XCircle size={23} />
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              TABLE
          ===================================================== */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Table Header */}
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Daftar Stok Barang
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Total{" "}
                  {formatNumber(
                    filteredData.length
                  )}{" "}
                  barang
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-80">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    handleSearchChange(
                      event.target.value
                    )
                  }
                  placeholder="Cari kode, nama, atau detail..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[350px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                  <p className="text-sm text-slate-500">
                    Memuat data stok...
                  </p>
                </div>
              </div>
            ) : currentData.length === 0 ? (
              /* Empty State */
              <div className="flex min-h-[350px] flex-col items-center justify-center px-5 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Package size={30} />
                </div>

                <h3 className="text-base font-semibold text-slate-700">
                  Data tidak ditemukan
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {search
                    ? "Coba gunakan kata kunci pencarian yang lain."
                    : "Belum ada data stok barang."}
                </p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1250px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          No
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Kode Barang
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nama Barang
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Detail / Ukuran
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Satuan Masuk
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Konversi
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Total Masuk
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Total Keluar
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sisa Stok
                        </th>

                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status Stok
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentData.map(
                        (barang, index) => (
                          <tr
                            key={barang.id}
                            className="border-b border-slate-100 transition hover:bg-slate-50"
                          >
                            {/* No */}
                            <td className="px-5 py-4 text-sm text-slate-500">
                              {startIndex +
                                index +
                                1}
                            </td>

                            {/* Kode */}
                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                {formatKodeBarang(
                                  barang.kode_barang,
                                  barang.id
                                )}
                              </span>
                            </td>

                            {/* Nama */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {
                                    barang.nama_barang
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Stok:{" "}
                                  {
                                    barang.satuan_keluar
                                  }
                                </p>
                              </div>
                            </td>

                            {/* Detail */}
                            <td className="px-5 py-4 text-sm text-slate-600">
                              {barang.detail_ukuran ||
                                "-"}
                            </td>

                            {/* Satuan Masuk */}
                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                                {
                                  barang.satuan_masuk
                                }
                              </span>
                            </td>

                            {/* Konversi */}
                            <td className="px-5 py-4">
                              {renderKonversi(
                                barang
                              )}
                            </td>

                            {/* Total Masuk */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="text-sm font-semibold text-emerald-600">
                                  {formatNumber(
                                    barang.total_masuk
                                  )}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {
                                    barang.satuan_keluar
                                  }
                                </p>
                              </div>
                            </td>

                            {/* Total Keluar */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="text-sm font-semibold text-red-600">
                                  {formatNumber(
                                    barang.total_keluar
                                  )}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {
                                    barang.satuan_keluar
                                  }
                                </p>
                              </div>
                            </td>

                            {/* Sisa Stok */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  {formatNumber(
                                    barang.sisa_stok
                                  )}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {
                                    barang.satuan_keluar
                                  }
                                </p>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              {renderStatus(
                                barang.status_stok
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredData.length === 0
                        ? 0
                        : startIndex + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        startIndex +
                          itemsPerPage,
                        filteredData.length
                      )}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-700">
                      {
                        filteredData.length
                      }
                    </span>{" "}
                    barang
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={
                        goToPreviousPage
                      }
                      disabled={
                        safeCurrentPage === 1
                      }
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft
                        size={16}
                      />
                      Sebelumnya
                    </button>

                    <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">
                      {safeCurrentPage}
                    </div>

                    <button
                      type="button"
                      onClick={
                        goToNextPage
                      }
                      disabled={
                        safeCurrentPage >=
                          totalPages ||
                        totalPages === 0
                      }
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Berikutnya
                      <ChevronRight
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
