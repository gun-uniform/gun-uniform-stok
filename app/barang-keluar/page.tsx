"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  PackageMinus,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";

import Sidebar from "@/component/layout/Sidebar";
import Navbar from "@/component/layout/Navbar";
import api from "@/lib/api";

interface BarangKeluar {
  id: number;
  tanggal: string;
  nomor_transaksi: string;
  barang_id: number;
  kode_barang: string;
  nama_barang: string;
  detail_ukuran: string | null;
  jumlah: number;
  satuan: string;
  jumlah_dasar: number;
  tujuan: string;
  keterangan: string | null;
}

interface Barang {
  id: number;
  kode_barang: string;
  nama_barang: string;
  detail_ukuran: string | null;
  satuan_masuk: string;
  isi_per_satuan: number | null;
  satuan_keluar: string;
  stok_minimum: number;
}

interface FormBarangKeluar {
  tanggal: string;
  barang_id: string;
  jumlah: string;
  tujuan: string;
  keterangan: string;
}

interface ApiErrorResponse {
  message?: string;
  stok_tersedia?: number;
  jumlah_dibutuhkan?: number;
  errors?: Record<string, string[]>;
}

interface ApiBarangKeluarItem {
  id: number;
  tanggal: string;
  nomor_transaksi: string;
  barang_id: number;
  jumlah: number;
  satuan: string;
  jumlah_dasar: number;
  tujuan: string;
  keterangan: string | null;
  barang?: {
    id: number;
    kode_barang: string;
    nama_barang: string;
    detail_ukuran: string | null;
    satuan_masuk?: string;
    isi_per_satuan?: number | null;
    satuan_keluar?: string;
    stok_minimum?: number;
  };
}

/**
 * Mengambil tanggal hari ini.
 */
const getToday = (): string => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Normalisasi response API.
 */
const normalizeArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object" && "data" in data) {
    const responseData = (data as { data?: unknown }).data;

    if (Array.isArray(responseData)) {
      return responseData as T[];
    }
  }

  return [];
};

/**
 * Normalisasi data Barang Keluar.
 *
 * Backend mengembalikan:
 *
 * {
 *   id,
 *   tanggal,
 *   nomor_transaksi,
 *   barang_id,
 *   jumlah,
 *   satuan,
 *   jumlah_dasar,
 *   tujuan,
 *   keterangan,
 *   barang: {
 *     kode_barang,
 *     nama_barang,
 *     detail_ukuran
 *   }
 * }
 *
 * Sedangkan frontend menggunakan data flat.
 */
const normalizeBarangKeluar = (
  data: unknown
): BarangKeluar[] => {
  const items =
    normalizeArray<ApiBarangKeluarItem>(data);

  return items.map((item) => ({
    id: item.id,
    tanggal: item.tanggal,
    nomor_transaksi: item.nomor_transaksi,
    barang_id: item.barang_id,
    kode_barang:
      item.barang?.kode_barang ?? "-",
    nama_barang:
      item.barang?.nama_barang ?? "-",
    detail_ukuran:
      item.barang?.detail_ukuran ?? null,
    jumlah: Number(item.jumlah ?? 0),
    satuan: item.satuan ?? "PCS",
    jumlah_dasar: Number(
      item.jumlah_dasar ?? 0
    ),
    tujuan: item.tujuan ?? "",
    keterangan: item.keterangan ?? null,
  }));
};

/**
 * Helper error.
 */
const getErrorMessage = (
  error: unknown
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: ApiErrorResponse;
        };
      }
    ).response;

    const responseData = response?.data;

    // Laravel validation error
    if (responseData?.errors) {
      const validationErrors = Object.values(
        responseData.errors
      ).flat();

      if (validationErrors.length > 0) {
        return validationErrors[0];
      }
    }

    // Error dari controller
    if (responseData?.message) {
      let message = responseData.message;

      if (
        typeof responseData.stok_tersedia ===
        "number"
      ) {
        message += ` Stok tersedia: ${responseData.stok_tersedia.toLocaleString(
          "id-ID"
        )}.`;
      }

      return message;
    }

    if (response?.status === 422) {
      return "Data yang dikirim tidak valid.";
    }

    if (response?.status === 404) {
      return "Data tidak ditemukan.";
    }

    if (response?.status === 500) {
      return "Terjadi kesalahan pada server.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba lagi.";
};

export default function BarangKeluarPage() {
  const [dataBarangKeluar, setDataBarangKeluar] =
    useState<BarangKeluar[]>([]);

  const [dataBarang, setDataBarang] =
    useState<Barang[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [showDetailModal, setShowDetailModal] =
    useState(false);

  const [selectedData, setSelectedData] =
    useState<BarangKeluar | null>(null);

  const [form, setForm] =
    useState<FormBarangKeluar>({
      tanggal: getToday(),
      barang_id: "",
      jumlah: "",
      tujuan: "",
      keterangan: "",
    });

  /**
   * =====================================================
   * LOAD DATA
   * =====================================================
   */
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          barangKeluarResponse,
          barangResponse,
        ] = await Promise.all([
          api.get("/barang-keluar"),
          api.get("/barang"),
        ]);

        if (cancelled) {
          return;
        }

        const barangKeluarData =
          normalizeBarangKeluar(
            barangKeluarResponse.data
          );

        const barangData =
          normalizeArray<Barang>(
            barangResponse.data
          );

        setDataBarangKeluar(
          barangKeluarData
        );

        setDataBarang(barangData);
      } catch (error: unknown) {
        console.error(
          "Gagal mengambil data:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * =====================================================
   * REFRESH BARANG KELUAR
   * =====================================================
   */
  const refreshBarangKeluar =
    async (): Promise<void> => {
      try {
        const response =
          await api.get("/barang-keluar");

        const data =
          normalizeBarangKeluar(
            response.data
          );

        setDataBarangKeluar(data);
      } catch (error: unknown) {
        console.error(
          "Gagal memperbarui data barang keluar:",
          error
        );

        throw error;
      }
    };

  /**
   * =====================================================
   * REFRESH MASTER BARANG
   * =====================================================
   */
  const refreshBarang =
    async (): Promise<void> => {
      try {
        const response =
          await api.get("/barang");

        const data =
          normalizeArray<Barang>(
            response.data
          );

        setDataBarang(data);
      } catch (error: unknown) {
        console.error(
          "Gagal memperbarui master barang:",
          error
        );

        throw error;
      }
    };

  /**
   * =====================================================
   * BARANG YANG DIPILIH
   * =====================================================
   */
  const selectedBarang = useMemo(() => {
    if (!form.barang_id) {
      return null;
    }

    return (
      dataBarang.find(
        (barang) =>
          barang.id ===
          Number(form.barang_id)
      ) ?? null
    );
  }, [
    dataBarang,
    form.barang_id,
  ]);

  /**
   * =====================================================
   * SEARCH
   * =====================================================
   */
  const filteredData = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return dataBarangKeluar;
    }

    return dataBarangKeluar.filter(
      (item) => {
        return (
          item.nomor_transaksi
            ?.toLowerCase()
            .includes(keyword) ||
          item.kode_barang
            ?.toLowerCase()
            .includes(keyword) ||
          item.nama_barang
            ?.toLowerCase()
            .includes(keyword) ||
          item.tujuan
            ?.toLowerCase()
            .includes(keyword) ||
          item.keterangan
            ?.toLowerCase()
            .includes(keyword)
        );
      }
    );
  }, [
    dataBarangKeluar,
    search,
  ]);

  /**
   * =====================================================
   * FORM CHANGE
   * =====================================================
   */
  const handleFormChange = (
    field: keyof FormBarangKeluar,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * =====================================================
   * OPEN CREATE MODAL
   * =====================================================
   */
  const openCreateModal = () => {
    setErrorMessage("");

    setForm({
      tanggal: getToday(),
      barang_id: "",
      jumlah: "",
      tujuan: "",
      keterangan: "",
    });

    setShowModal(true);
  };

  /**
   * =====================================================
   * CLOSE MODAL
   * =====================================================
   */
  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setErrorMessage("");
  };

  /**
   * =====================================================
   * SUBMIT
   * =====================================================
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");

    /**
     * Validasi tanggal
     */
    if (!form.tanggal) {
      setErrorMessage(
        "Tanggal wajib diisi."
      );
      return;
    }

    /**
     * Validasi barang
     */
    if (!form.barang_id) {
      setErrorMessage(
        "Barang wajib dipilih."
      );
      return;
    }

    /**
     * Validasi barang
     */
    if (!selectedBarang) {
      setErrorMessage(
        "Data barang tidak ditemukan."
      );
      return;
    }

    /**
     * Validasi jumlah
     */
    const jumlah = Number(form.jumlah);

    if (
      !Number.isFinite(jumlah) ||
      jumlah <= 0
    ) {
      setErrorMessage(
        "Jumlah keluar harus lebih dari 0."
      );
      return;
    }

    /**
     * Validasi tujuan
     */
    if (!form.tujuan.trim()) {
      setErrorMessage(
        "Tujuan wajib diisi."
      );
      return;
    }

    /**
     * Satuan otomatis dari master barang.
     *
     * Backend membutuhkan field:
     * satuan
     */
    const satuan =
      selectedBarang.satuan_keluar?.trim();

    if (!satuan) {
      setErrorMessage(
        "Satuan keluar barang belum tersedia."
      );
      return;
    }

    /**
     * =====================================================
     * PAYLOAD
     * =====================================================
     *
     * Nomor transaksi TIDAK dikirim.
     *
     * Laravel akan membuat:
     *
     * BK-20260918-0001
     * BK-20260918-0002
     * BK-20260918-0003
     *
     * jumlah_dasar juga TIDAK dikirim.
     * Laravel menghitung:
     *
     * jumlah_dasar = jumlah
     */
    const payload = {
      tanggal: form.tanggal,
      barang_id: Number(form.barang_id),
      jumlah: jumlah,
      satuan: satuan,
      tujuan: form.tujuan.trim(),
      keterangan:
        form.keterangan.trim() || null,
    };

    try {
      setSaving(true);

      console.log(
        "Payload Barang Keluar:",
        payload
      );

      const response =
        await api.post(
          "/barang-keluar",
          payload
        );

      console.log(
        "Barang Keluar berhasil disimpan:",
        response.data
      );

      /**
       * Refresh data setelah berhasil
       */
      await Promise.all([
        refreshBarangKeluar(),
        refreshBarang(),
      ]);

      /**
       * Reset form
       */
      setForm({
        tanggal: getToday(),
        barang_id: "",
        jumlah: "",
        tujuan: "",
        keterangan: "",
      });

      setShowModal(false);
      setErrorMessage("");
    } catch (error: unknown) {
      console.error(
        "Gagal menyimpan barang keluar:",
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * =====================================================
   * DETAIL
   * =====================================================
   */
  const handleDetail = (
    item: BarangKeluar
  ) => {
    setSelectedData(item);
    setShowDetailModal(true);
  };

  /**
   * =====================================================
   * DELETE
   * =====================================================
   */
  const handleDelete = async (
    id: number
  ) => {
    const item =
      dataBarangKeluar.find(
        (data) => data.id === id
      );

    if (!item) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus transaksi ${item.nomor_transaksi}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");

      await api.delete(
        `/barang-keluar/${id}`
      );

      await Promise.all([
        refreshBarangKeluar(),
        refreshBarang(),
      ]);
    } catch (error: unknown) {
      console.error(
        "Gagal menghapus barang keluar:",
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    }
  };

  /**
   * =====================================================
   * FORMAT TANGGAL
   * =====================================================
   */
  const formatTanggal = (
    tanggal: string
  ): string => {
    if (!tanggal) {
      return "-";
    }

    const date = new Date(
      `${tanggal.slice(
        0,
        10
      )}T00:00:00`
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return tanggal;
    }

    return date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  /**
   * =====================================================
   * SUMMARY
   * =====================================================
   */
  const totalTransaksi =
    dataBarangKeluar.length;

  const totalUnitKeluar =
    dataBarangKeluar.reduce(
      (total, item) =>
        total +
        Number(
          item.jumlah_dasar || 0
        ),
      0
    );

  const totalTujuan =
    new Set(
      dataBarangKeluar
        .map(
          (item) => item.tujuan
        )
        .filter(Boolean)
    ).size;

  /**
   * =====================================================
   * RENDER
   * =====================================================
   */
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />

      <main className="ml-64 pt-20">
        <div className="p-8">

          {/* HEADER */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                  <PackageMinus className="h-6 w-6 text-red-600" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    Barang Keluar
                  </h1>

                  <p className="text-sm text-slate-500">
                    Kelola data barang yang keluar
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <Plus className="h-5 w-5" />
              Tambah Barang Keluar
            </button>
          </div>

          {/* GLOBAL ERROR */}
          {errorMessage &&
            !showModal && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

          {/* SUMMARY */}
          <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total Transaksi
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-800">
                {totalTransaksi}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total Barang Keluar
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-800">
                {totalUnitKeluar.toLocaleString(
                  "id-ID"
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total Tujuan
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-800">
                {totalTujuan}
              </p>
            </div>

          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* SEARCH */}
            <div className="border-b border-slate-200 p-5">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Cari transaksi, kode, nama barang..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            {/* LOADING */}
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Memuat data...
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <PackageMinus className="mb-3 h-12 w-12 text-slate-300" />

                <h3 className="text-lg font-semibold text-slate-700">
                  Belum ada data
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Data barang keluar akan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        No. Transaksi
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Tanggal
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Kode Barang
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Nama Barang
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Detail / Ukuran
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Jumlah Keluar
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Jumlah Dasar
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Tujuan
                      </th>

                      <th className="px-5 py-4 font-semibold text-slate-600">
                        Keterangan
                      </th>

                      <th className="px-5 py-4 text-center font-semibold text-slate-600">
                        Aksi
                      </th>

                    </tr>
                  </thead>

                  <tbody>
                    {filteredData.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 transition hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">
                            <span className="font-semibold text-red-600">
                              {item.nomor_transaksi ||
                                "-"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {formatTanggal(
                              item.tanggal
                            )}
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700">
                            {item.kode_barang}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {item.nama_barang}
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {item.detail_ukuran ||
                              "-"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-semibold text-red-600">
                              {Number(
                                item.jumlah
                              ).toLocaleString(
                                "id-ID"
                              )}{" "}
                              {item.satuan}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-medium text-slate-700">
                              {Number(
                                item.jumlah_dasar ||
                                  0
                              ).toLocaleString(
                                "id-ID"
                              )}{" "}
                              PCS
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {item.tujuan ||
                              "-"}
                          </td>

                          <td className="max-w-[200px] px-5 py-4 text-slate-500">
                            <span className="line-clamp-2">
                              {item.keterangan ||
                                "-"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  handleDetail(
                                    item
                                  )
                                }
                                title="Lihat detail"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                disabled
                                title="Edit belum tersedia"
                                className="cursor-not-allowed rounded-lg p-2 text-slate-300"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    item.id
                                  )
                                }
                                title="Hapus"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                            </div>
                          </td>

                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* FOOTER */}
            {!loading &&
              filteredData.length > 0 && (
                <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
                  Menampilkan{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredData.length}
                  </span>{" "}
                  transaksi
                </div>
              )}

          </div>
        </div>
      </main>

      {/* =====================================================
          MODAL TAMBAH BARANG KELUAR
          ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Tambah Barang Keluar
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Nomor transaksi dibuat otomatis oleh sistem.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit}>

              <div className="space-y-5 px-6 py-6">

                {/* ERROR */}
                {errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}

                {/* TANGGAL */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Tanggal
                  </label>

                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <input
                      type="date"
                      value={form.tanggal}
                      onChange={(event) =>
                        handleFormChange(
                          "tanggal",
                          event.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* BARANG */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Barang
                  </label>

                  <select
                    value={form.barang_id}
                    onChange={(event) =>
                      handleFormChange(
                        "barang_id",
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option
                      value=""
                      className="bg-white text-slate-900"
                    >
                      -- Pilih Barang --
                    </option>

                    {dataBarang.map(
                      (barang) => (
                        <option
                          key={barang.id}
                          value={barang.id}
                          className="bg-white text-slate-900"
                        >
                          {barang.kode_barang} -{" "}
                          {barang.nama_barang}

                          {barang.detail_ukuran
                            ? ` (${barang.detail_ukuran})`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* DETAIL BARANG */}
                {selectedBarang && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Kode Barang
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {selectedBarang.kode_barang}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Nama Barang
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {selectedBarang.nama_barang}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Satuan Keluar
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {selectedBarang.satuan_keluar ||
                            "PCS"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Detail / Ukuran
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {selectedBarang.detail_ukuran ||
                            "-"}
                        </p>
                      </div>

                    </div>

                    {/* INFO SATUAN */}
                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      Barang akan dikeluarkan menggunakan satuan{" "}
                      <span className="font-bold">
                        {selectedBarang.satuan_keluar ||
                          "PCS"}
                      </span>
                      .
                    </div>

                  </div>
                )}

                {/* JUMLAH */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Jumlah Keluar
                  </label>

                  <div className="flex gap-3">

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.jumlah}
                      onChange={(event) =>
                        handleFormChange(
                          "jumlah",
                          event.target.value
                        )
                      }
                      disabled={
                        saving ||
                        !selectedBarang
                      }
                      placeholder="Masukkan jumlah"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />

                    <div className="flex min-w-[100px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700">
                      {selectedBarang?.satuan_keluar ||
                        "PCS"}
                    </div>

                  </div>
                </div>

                {/* PREVIEW */}
                {selectedBarang &&
                  form.jumlah &&
                  Number(form.jumlah) > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                      <p className="text-sm font-semibold text-amber-900">
                        Preview Pengurangan Stok
                      </p>

                      <div className="mt-2 text-sm text-amber-800">
                        <span className="font-bold text-amber-900">
                          {Number(
                            form.jumlah
                          ).toLocaleString(
                            "id-ID"
                          )}{" "}
                          {
                            selectedBarang.satuan_keluar ||
                            "PCS"
                          }
                        </span>{" "}
                        akan mengurangi stok sebesar{" "}
                        <span className="font-bold text-amber-900">
                          {Number(
                            form.jumlah
                          ).toLocaleString(
                            "id-ID"
                          )}{" "}
                          PCS
                        </span>
                        .
                      </div>

                    </div>
                  )}

                {/* TUJUAN */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Tujuan
                  </label>

                  <input
                    type="text"
                    value={form.tujuan}
                    onChange={(event) =>
                      handleFormChange(
                        "tujuan",
                        event.target.value
                      )
                    }
                    disabled={saving}
                    placeholder="Contoh: Departemen IT"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {/* KETERANGAN */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Keterangan
                  </label>

                  <textarea
                    value={form.keterangan}
                    onChange={(event) =>
                      handleFormChange(
                        "keterangan",
                        event.target.value
                      )
                    }
                    disabled={saving}
                    rows={3}
                    placeholder="Keterangan tambahan (opsional)"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? "Menyimpan..."
                    : "Simpan Barang Keluar"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL DETAIL
          ===================================================== */}

      {showDetailModal &&
        selectedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Detail Barang Keluar
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Informasi lengkap transaksi
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDetailModal(false)
                  }
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              {/* BODY */}
              <div className="space-y-4 px-6 py-6">

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-red-500">
                    No. Transaksi
                  </p>

                  <p className="mt-1 text-lg font-bold text-red-700">
                    {selectedData.nomor_transaksi}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Tanggal
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {formatTanggal(
                        selectedData.tanggal
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Kode Barang
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {selectedData.kode_barang}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Nama Barang
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {selectedData.nama_barang}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Detail / Ukuran
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {selectedData.detail_ukuran ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Jumlah Keluar
                    </p>

                    <p className="mt-1 font-medium text-red-600">
                      {Number(
                        selectedData.jumlah
                      ).toLocaleString(
                        "id-ID"
                      )}{" "}
                      {selectedData.satuan}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Jumlah Dasar
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {Number(
                        selectedData.jumlah_dasar ||
                          0
                      ).toLocaleString(
                        "id-ID"
                      )}{" "}
                      PCS
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Tujuan
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {selectedData.tujuan ||
                        "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Keterangan
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {selectedData.keterangan ||
                        "-"}
                    </p>
                  </div>

                </div>
              </div>

              {/* FOOTER */}
              <div className="border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowDetailModal(
                      false
                    )
                  }
                  className="w-full rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        )}
    </div>
  );
}