
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import {
  Search,
  PackagePlus,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CalendarDays,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import Sidebar from "@/component/layout/Sidebar";
import Navbar from "@/component/layout/Navbar";
import api from "@/lib/api";

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

interface BarangMasuk {
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
  satuan_keluar?: string;
  isi_per_satuan?: number | null;
  supplier: string | null;
  keterangan: string | null;
}

type UserRole = "admin" | "pimpinan" | "gudang";

interface FormData {
  tanggal: string;
  kode_barang: string;
  nama_barang: string;
  detail_ukuran: string;
  satuan_masuk: string;
  isi_per_satuan: string;
  satuan_keluar: string;
  stok_minimum: string;
  jumlah: string;
  supplier: string;
  keterangan: string;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const createInitialForm = (): FormData => ({
  tanggal: today(),
  kode_barang: "",
  nama_barang: "",
  detail_ukuran: "",
  satuan_masuk: "",
  isi_per_satuan: "",
  satuan_keluar: "PCS",
  stok_minimum: "0",
  jumlah: "",
  supplier: "",
  keterangan: "",
});

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;

    if (Array.isArray(object.data)) {
      return object.data as T[];
    }

    if (
      object.data &&
      typeof object.data === "object" &&
      Array.isArray((object.data as Record<string, unknown>).data)
    ) {
      return (object.data as { data: T[] }).data;
    }
  }

  return [];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | {
          message?: string;
          error?: string;
          errors?: Record<string, string[]>;
        }
      | undefined;

    if (responseData?.errors) {
      const firstError = Object.values(responseData.errors).flat()[0];
      if (firstError) return firstError;
    }

    return responseData?.message || responseData?.error || fallback;
  }

  return fallback;
}

function formatKodeBarang(kode?: string | null) {
  if (!kode) return "-";

  const value = kode.trim().toUpperCase();
  const match = value.match(/^(?:BRG-?)?(\d+)$/);

  if (!match) return value;

  return `BRG-${match[1].padStart(4, "0")}`;
}

function formatNumber(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("id-ID");
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="break-words text-sm font-medium text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function BarangMasukPage() {
  const [data, setData] = useState<BarangMasuk[]>([]);
  const [dataBarang, setDataBarang] = useState<Barang[]>([]);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedData, setSelectedData] = useState<BarangMasuk | null>(null);

  const [form, setForm] = useState<FormData>(createInitialForm());
  const [barangDitemukan, setBarangDitemukan] = useState<Barang | null>(null);
  const [barangBaru, setBarangBaru] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const itemsPerPage = 10;

  // Hanya admin dan gudang yang boleh mengelola transaksi.
  const canManageBarangMasuk =
    currentUserRole === "admin" || currentUserRole === "gudang";

  // Baca role dari user yang tersimpan setelah halaman dimuat.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setCurrentUserRole(null);
        return;
      }

      const user = JSON.parse(storedUser);
      const role = String(user.role ?? "").trim().toLowerCase();

      if (role === "admin" || role === "pimpinan" || role === "gudang") {
        setCurrentUserRole(role);
      } else {
        setCurrentUserRole(null);
      }
    } catch (err) {
      console.error("Gagal membaca role pengguna:", err);
      setCurrentUserRole(null);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const [masukResponse, barangResponse] = await Promise.all([
      api.get("/barang-masuk"),
      api.get("/barang"),
    ]);

    setData(normalizeArray<BarangMasuk>(masukResponse.data));
    setDataBarang(normalizeArray<Barang>(barangResponse.data));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [masukResponse, barangResponse] = await Promise.all([
          api.get("/barang-masuk"),
          api.get("/barang"),
        ]);

        if (cancelled) return;

        setData(normalizeArray<BarangMasuk>(masukResponse.data));
        setDataBarang(normalizeArray<Barang>(barangResponse.data));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Gagal mengambil data barang masuk.")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
    setBarangDitemukan(null);
    setBarangBaru(false);
    setError("");
  };

  const getNextKodeBarang = () => {
    let maxNumber = 0;

    dataBarang.forEach((barang) => {
      const kode = String(barang.kode_barang ?? "").trim().toUpperCase();
      const match = kode.match(/^(?:BRG-?)?(\d+)$/);

      if (match) {
        maxNumber = Math.max(maxNumber, Number(match[1]));
      }
    });

    return `BRG-${String(maxNumber + 1).padStart(4, "0")}`;
  };

  const formatKonversi = (
    barang: Pick<
      Barang,
      "satuan_masuk" | "satuan_keluar" | "isi_per_satuan"
    > | null
  ) => {
    if (!barang) return "-";

    const masuk = barang.satuan_masuk?.trim();
    const keluar = barang.satuan_keluar?.trim();
    const isi = Number(barang.isi_per_satuan);

    if (
      masuk &&
      keluar &&
      masuk.toUpperCase() !== keluar.toUpperCase() &&
      isi > 0
    ) {
      return `1 ${masuk} = ${formatNumber(isi)} ${keluar}`;
    }

    return `Satuan stok: ${keluar || masuk || "-"}`;
  };

  const handleAdd = () => {
    if (!canManageBarangMasuk) return;

    resetForm();

    setForm({
      ...createInitialForm(),
      kode_barang: getNextKodeBarang(),
    });

    setBarangBaru(true);
    setSuccess("");
    setShowModal(true);
  };

  const handleKodeBarangChange = (value: string) => {
    if (!canManageBarangMasuk) return;

    const kode = value.trim();

    setForm((previous) => ({
      ...previous,
      kode_barang: value,
    }));

    if (!kode) {
      setBarangDitemukan(null);
      setBarangBaru(false);

      setForm((previous) => ({
        ...previous,
        kode_barang: value,
        nama_barang: "",
        detail_ukuran: "",
        satuan_masuk: "",
        isi_per_satuan: "",
        satuan_keluar: "PCS",
        stok_minimum: "0",
      }));

      return;
    }

    const barang = dataBarang.find(
      (item) =>
        item.kode_barang?.trim().toLowerCase() === kode.toLowerCase() ||
        formatKodeBarang(item.kode_barang).toLowerCase() ===
          formatKodeBarang(kode).toLowerCase()
    );

    if (barang) {
      setBarangDitemukan(barang);
      setBarangBaru(false);

      setForm((previous) => ({
        ...previous,
        kode_barang: value,
        nama_barang: barang.nama_barang || "",
        detail_ukuran: barang.detail_ukuran || "",
        satuan_masuk: barang.satuan_masuk || "",
        isi_per_satuan:
          barang.isi_per_satuan == null
            ? ""
            : String(barang.isi_per_satuan),
        satuan_keluar: barang.satuan_keluar || "PCS",
        stok_minimum: String(barang.stok_minimum ?? 0),
      }));
    } else {
      setBarangDitemukan(null);
      setBarangBaru(true);

      setForm((previous) => ({
        ...previous,
        kode_barang: value,
        nama_barang: "",
        detail_ukuran: "",
        satuan_masuk: "",
        isi_per_satuan: "",
        satuan_keluar: "PCS",
        stok_minimum: "0",
      }));
    }
  };

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    if (!canManageBarangMasuk) return;

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Pengaman tambahan untuk role pimpinan.
    if (!canManageBarangMasuk) {
      setShowModal(false);
      setError("Anda tidak memiliki izin untuk mengubah barang masuk.");
      return;
    }

    setError("");
    setSuccess("");

    if (!form.tanggal) {
      setError("Tanggal wajib diisi.");
      return;
    }

    if (!form.kode_barang.trim()) {
      setError("Kode barang wajib diisi.");
      return;
    }

    if (!form.nama_barang.trim()) {
      setError("Nama barang wajib diisi.");
      return;
    }

    if (!form.satuan_masuk.trim()) {
      setError("Satuan masuk wajib diisi.");
      return;
    }

    if (!form.satuan_keluar.trim()) {
      setError("Satuan stok wajib diisi.");
      return;
    }

    const satuanMasuk = form.satuan_masuk.trim().toUpperCase();
    const satuanKeluar = form.satuan_keluar.trim().toUpperCase();
    const isi = Number(form.isi_per_satuan);
    const jumlah = Number(form.jumlah);
    const stokMinimum = Number(form.stok_minimum || 0);

    if (satuanMasuk !== satuanKeluar && (!isi || isi <= 0)) {
      setError(
        "Isi per satuan wajib diisi jika satuan masuk berbeda dari satuan stok."
      );
      return;
    }

    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      setError("Jumlah barang harus lebih dari 0.");
      return;
    }

    if (!Number.isFinite(stokMinimum) || stokMinimum < 0) {
      setError("Batas minimum stok tidak boleh negatif.");
      return;
    }

    const payload = {
      tanggal: form.tanggal,
      kode_barang: form.kode_barang.trim(),
      nama_barang: form.nama_barang.trim(),
      detail_ukuran: form.detail_ukuran.trim() || null,
      satuan_masuk: form.satuan_masuk.trim(),
      isi_per_satuan: satuanMasuk === satuanKeluar ? null : isi,
      satuan_keluar: form.satuan_keluar.trim(),
      stok_minimum: stokMinimum,
      jumlah,
      supplier: form.supplier.trim() || null,
      keterangan: form.keterangan.trim() || null,
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        await api.put(`/barang-masuk/${editingId}`, payload);
        setSuccess("Barang masuk berhasil diperbarui.");
      } else {
        await api.post("/barang-masuk", payload);
        setSuccess("Barang masuk berhasil ditambahkan.");
      }

      setShowModal(false);
      resetForm();

      try {
        await fetchData();
      } catch (refreshError: unknown) {
        setError(
          getErrorMessage(
            refreshError,
            "Transaksi tersimpan, tetapi data terbaru gagal dimuat. Silakan muat ulang halaman."
          )
        );
      }
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Gagal menyimpan data barang masuk.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: BarangMasuk) => {
    if (!canManageBarangMasuk) return;

    const barang = dataBarang.find((entry) => entry.id === item.barang_id);

    setEditingId(item.id);
    setBarangDitemukan(barang || null);
    setBarangBaru(!barang);

    setForm({
      tanggal: item.tanggal?.slice(0, 10) || today(),
      kode_barang: item.kode_barang || "",
      nama_barang: item.nama_barang || "",
      detail_ukuran: item.detail_ukuran || "",
      satuan_masuk: barang?.satuan_masuk || item.satuan || "",
      isi_per_satuan:
        barang?.isi_per_satuan != null
          ? String(barang.isi_per_satuan)
          : item.isi_per_satuan != null
            ? String(item.isi_per_satuan)
            : "",
      satuan_keluar:
        barang?.satuan_keluar || item.satuan_keluar || "PCS",
      stok_minimum: String(barang?.stok_minimum ?? 0),
      jumlah: String(item.jumlah ?? ""),
      supplier: item.supplier || "",
      keterangan: item.keterangan || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleDelete = async (item: BarangMasuk) => {
    if (!canManageBarangMasuk) {
      setError("Anda tidak memiliki izin untuk menghapus barang masuk.");
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin menghapus transaksi ${item.nomor_transaksi}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/barang-masuk/${item.id}`);
      setSuccess("Transaksi barang masuk berhasil dihapus.");
      await fetchData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gagal menghapus transaksi."));
    }
  };

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return data;

    return data.filter((item) =>
      [
        item.nomor_transaksi,
        item.kode_barang,
        item.nama_barang,
        item.supplier,
        item.keterangan,
      ].some((value) => String(value ?? "").toLowerCase().includes(keyword))
    );
  }, [data, search]);

  const totalTransaksi = data.length;

  const totalBarangMasuk = data.reduce(
    (total, item) =>
      total + Number(item.jumlah_dasar ?? item.jumlah ?? 0),
    0
  );

  const supplierCount = new Set(
    data.map((item) => item.supplier?.trim()).filter(Boolean)
  ).size;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / itemsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64">
        <Navbar />

        <main className="pt-20">
          <div className="p-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3">
                  <PackagePlus className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    Barang Masuk
                  </h1>
                  <p className="text-sm text-slate-500">
                    Kelola transaksi barang yang masuk ke dalam stok.
                  </p>
                </div>
              </div>

              {/* Tombol tambah hanya untuk admin dan gudang */}
              {canManageBarangMasuk && (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Tambah Barang Masuk
                </button>
              )}
            </div>

            {success && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{success}</span>
                <button
                  type="button"
                  className="ml-auto"
                  onClick={() => setSuccess("")}
                  aria-label="Tutup pesan sukses"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {error && !showModal && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
                <button
                  type="button"
                  className="ml-auto"
                  onClick={() => setError("")}
                  aria-label="Tutup pesan error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Total Transaksi</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {formatNumber(totalTransaksi)}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Total Barang Masuk</p>
                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {formatNumber(totalBarangMasuk)}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Dalam satuan stok
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Supplier</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {formatNumber(supplierCount)}
                </h2>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari kode, nama barang, transaksi..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    setError("");

                    try {
                      await fetchData();
                    } catch (err: unknown) {
                      setError(
                        getErrorMessage(err, "Gagal memuat ulang data.")
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Muat Ulang
                </button>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="py-20 text-center">
                    <PackagePlus className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-700">
                      {search
                        ? "Data tidak ditemukan"
                        : "Belum ada transaksi barang masuk"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {search
                        ? "Coba gunakan kata kunci pencarian lain."
                        : "Belum ada data transaksi barang masuk."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full min-w-[1250px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        {[
                          "No",
                          "Tanggal",
                          "No. Transaksi",
                          "Kode Barang",
                          "Nama Barang",
                          "Detail / Ukuran",
                          "Jumlah",
                          "Satuan",
                          "Konversi",
                          "Supplier",
                          "Keterangan",
                          "Aksi",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className={`px-5 py-4 ${
                              heading === "Aksi" ? "text-center" : ""
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.map((item, index) => {
                        const barang = dataBarang.find(
                          (entry) => entry.id === item.barang_id
                        );

                        const konversiBarang = barang
                          ? {
                              satuan_masuk: barang.satuan_masuk,
                              satuan_keluar: barang.satuan_keluar,
                              isi_per_satuan: barang.isi_per_satuan,
                            }
                          : item.satuan_keluar
                            ? {
                                satuan_masuk: item.satuan,
                                satuan_keluar: item.satuan_keluar,
                                isi_per_satuan: item.isi_per_satuan ?? null,
                              }
                            : null;

                        return (
                          <tr
                            key={item.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 text-slate-600">
                              {startIndex + index + 1}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-slate-700">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {item.tanggal?.slice(0, 10) || "-"}
                              </div>
                            </td>

                            <td className="px-5 py-4 font-semibold text-blue-600">
                              {item.nomor_transaksi || "-"}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                {formatKodeBarang(item.kode_barang)}
                              </span>
                            </td>

                            <td className="px-5 py-4 font-medium text-slate-800">
                              {item.nama_barang}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {item.detail_ukuran || "-"}
                            </td>

                            <td className="px-5 py-4 font-semibold text-slate-800">
                              {formatNumber(item.jumlah)}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {item.satuan || "-"}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {formatKonversi(konversiBarang)}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {item.supplier || "-"}
                            </td>

                            <td className="max-w-[200px] px-5 py-4 text-slate-600">
                              <span className="line-clamp-2">
                                {item.keterangan || "-"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-1">
                                {/* Semua role boleh melihat detail */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedData(item);
                                    setShowDetail(true);
                                  }}
                                  title="Lihat detail"
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                {/* Edit dan hapus hanya untuk admin/gudang */}
                                {canManageBarangMasuk && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(item)}
                                      title="Edit"
                                      className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(item)}
                                      title="Hapus"
                                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {!loading && filteredData.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4">
                  <p className="text-sm text-slate-500">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-700">
                      {startIndex + 1}–
                      {Math.min(
                        startIndex + itemsPerPage,
                        filteredData.length
                      )}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredData.length}
                    </span>{" "}
                    data
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={safeCurrentPage === 1}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>

                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium ${
                          safeCurrentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL TAMBAH / EDIT */}
      {showModal && canManageBarangMasuk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId !== null
                    ? "Edit Barang Masuk"
                    : "Tambah Barang Masuk"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Masukkan informasi transaksi barang masuk.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-6">
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="Tanggal" required>
                    <input
                      type="date"
                      name="tanggal"
                      value={form.tanggal}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Nomor Transaksi">
                    <input
                      value={
                        editingId !== null
                          ? data.find((item) => item.id === editingId)
                              ?.nomor_transaksi || "-"
                          : "Otomatis dibuat oleh sistem"
                      }
                      disabled
                      className={`${inputClass} cursor-not-allowed bg-slate-100`}
                    />
                  </FormField>
                </div>

                <FormField label="Kode Barang" required>
                  <input
                    name="kode_barang"
                    value={form.kode_barang}
                    onChange={(event) =>
                      handleKodeBarangChange(event.target.value)
                    }
                    placeholder="Contoh: BRG-0001"
                    required
                    className={`${inputClass} uppercase`}
                  />

                  {barangDitemukan && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Barang sudah terdaftar. Data barang digunakan secara
                      otomatis.
                    </p>
                  )}

                  {barangBaru && form.kode_barang.trim() && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                      <PackagePlus className="h-4 w-4" />
                      Kode belum terdaftar. Data barang baru akan dibuat jika
                      didukung backend.
                    </p>
                  )}
                </FormField>

                <FormField label="Nama Barang" required>
                  <input
                    name="nama_barang"
                    value={form.nama_barang}
                    onChange={handleChange}
                    disabled={!!barangDitemukan}
                    placeholder="Masukkan nama barang"
                    required
                    className={inputClass}
                  />
                </FormField>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="Satuan Masuk" required>
                    <input
                      name="satuan_masuk"
                      value={form.satuan_masuk}
                      onChange={handleChange}
                      disabled={!!barangDitemukan}
                      placeholder="PCS / PACK / BOX"
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Isi per Satuan">
                    <input
                      type="number"
                      name="isi_per_satuan"
                      value={form.isi_per_satuan}
                      onChange={handleChange}
                      disabled={
                        !!barangDitemukan ||
                        form.satuan_masuk.trim().toUpperCase() === "PCS"
                      }
                      min="1"
                      step="1"
                      placeholder="Contoh: 25"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Contoh: 1 PACK = 25 PCS.
                    </p>
                  </FormField>
                </div>

                <FormField label="Satuan Stok" required>
                  <input
                    name="satuan_keluar"
                    value={form.satuan_keluar}
                    onChange={handleChange}
                    disabled={!!barangDitemukan}
                    placeholder="Contoh: PCS"
                    required
                    className={inputClass}
                  />
                </FormField>

                {barangDitemukan && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
                      Konversi Stok
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {formatKonversi(barangDitemukan)}
                    </p>
                  </div>
                )}

                <FormField label="Detail / Ukuran">
                  <input
                    name="detail_ukuran"
                    value={form.detail_ukuran}
                    onChange={handleChange}
                    disabled={!!barangDitemukan}
                    placeholder="Contoh: Ukuran L / 10 Meter"
                    className={inputClass}
                  />
                </FormField>

                {barangBaru && (
                  <FormField label="Batas Minimum Stok">
                    <input
                      type="number"
                      name="stok_minimum"
                      value={form.stok_minimum}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Digunakan untuk menentukan status stok menipis.
                    </p>
                  </FormField>
                )}

                <FormField label="Jumlah Barang Masuk" required>
                  <input
                    type="number"
                    name="jumlah"
                    value={form.jumlah}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    placeholder={`Jumlah dalam ${
                      form.satuan_masuk || "satuan masuk"
                    }`}
                    required
                    className={inputClass}
                  />

                  {form.jumlah && form.satuan_masuk && (
                    <p className="mt-2 text-xs text-slate-500">
                      Jumlah masuk:{" "}
                      <strong>
                        {formatNumber(form.jumlah)} {form.satuan_masuk}
                      </strong>
                      {form.satuan_masuk.trim().toUpperCase() !==
                        form.satuan_keluar.trim().toUpperCase() &&
                        Number(form.isi_per_satuan) > 0 && (
                          <>
                            {" → "}
                            <strong className="text-blue-600">
                              {formatNumber(
                                Number(form.jumlah) *
                                  Number(form.isi_per_satuan)
                              )}{" "}
                              {form.satuan_keluar}
                            </strong>
                          </>
                        )}
                    </p>
                  )}
                </FormField>

                <FormField label="Supplier">
                  <input
                    name="supplier"
                    value={form.supplier}
                    onChange={handleChange}
                    placeholder="Nama supplier"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Keterangan">
                  <textarea
                    name="keterangan"
                    value={form.keterangan}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Keterangan tambahan..."
                    className={`${inputClass} resize-y`}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {saving
                    ? "Menyimpan..."
                    : editingId !== null
                      ? "Simpan Perubahan"
                      : "Simpan Barang Masuk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL: bisa dibuka oleh semua role */}
      {showDetail && selectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Detail Barang Masuk
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedData.nomor_transaksi || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup detail"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <DetailItem
                label="Tanggal"
                value={selectedData.tanggal?.slice(0, 10) || "-"}
              />
              <DetailItem
                label="Nomor Transaksi"
                value={selectedData.nomor_transaksi || "-"}
              />
              <DetailItem
                label="Kode Barang"
                value={formatKodeBarang(selectedData.kode_barang)}
              />
              <DetailItem
                label="Nama Barang"
                value={selectedData.nama_barang || "-"}
              />
              <DetailItem
                label="Detail / Ukuran"
                value={selectedData.detail_ukuran || "-"}
              />
              <DetailItem
                label="Jumlah Masuk"
                value={`${formatNumber(selectedData.jumlah)} ${
                  selectedData.satuan || ""
                }`}
              />
              <DetailItem
                label="Jumlah dalam Stok"
                value={`${formatNumber(
                  selectedData.jumlah_dasar ?? selectedData.jumlah
                )} ${selectedData.satuan_keluar || "PCS"}`}
              />
              <DetailItem
                label="Konversi"
                value={
                  selectedData.satuan_keluar &&
                  Number(selectedData.isi_per_satuan) > 0
                    ? `1 ${selectedData.satuan} = ${formatNumber(
                        selectedData.isi_per_satuan
                      )} ${selectedData.satuan_keluar}`
                    : selectedData.satuan || "-"
                }
              />
              <DetailItem
                label="Supplier"
                value={selectedData.supplier || "-"}
              />
              <DetailItem
                label="Keterangan"
                value={selectedData.keterangan || "-"}
              />
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-900"
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
