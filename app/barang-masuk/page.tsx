"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import Sidebar from "@/component/layout/Sidebar";
import Navbar from "@/component/layout/Navbar";
import api from "@/lib/api";

/* =========================================================
   INTERFACE BARANG
========================================================= */

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

/* =========================================================
   INTERFACE BARANG MASUK
========================================================= */

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

/* =========================================================
   FORM DATA
========================================================= */

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

/* =========================================================
   INITIAL FORM
========================================================= */

const initialForm: FormData = {
  tanggal: new Date().toISOString().split("T")[0],

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
};

/* =========================================================
   PAGE
========================================================= */

export default function BarangMasukPage() {
  const [data, setData] = useState<BarangMasuk[]>([]);
  const [dataBarang, setDataBarang] = useState<Barang[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedData, setSelectedData] =
    useState<BarangMasuk | null>(null);

  const [form, setForm] = useState<FormData>(initialForm);

  const [barangDitemukan, setBarangDitemukan] =
    useState<Barang | null>(null);

  const [barangBaru, setBarangBaru] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  /* =========================================================
     NORMALIZE RESPONSE
  ========================================================= */

  const normalizeArray = <T,>(responseData: unknown): T[] => {
    if (Array.isArray(responseData)) {
      return responseData as T[];
    }

    if (
      responseData &&
      typeof responseData === "object" &&
      "data" in responseData
    ) {
      const nestedData = (responseData as { data?: unknown }).data;

      if (Array.isArray(nestedData)) {
        return nestedData as T[];
      }
    }

    return [];
  };

  /* =========================================================
     FETCH DATA
  ========================================================= */

  const fetchData = async () => {
    try {
      const [masukResponse, barangResponse] =
        await Promise.all([
          api.get("/barang-masuk"),
          api.get("/barang"),
        ]);

      const masukData = normalizeArray<BarangMasuk>(
        masukResponse.data
      );

      const barangData = normalizeArray<Barang>(
        barangResponse.data
      );

      setData(masukData);
      setDataBarang(barangData);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Gagal mengambil data barang masuk."
        );
      } else {
        setError(
          "Gagal mengambil data barang masuk."
        );
      }
    }
  };

  /* =========================================================
     INITIAL LOAD

     Tidak ada setCurrentPage di dalam effect.
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [masukResponse, barangResponse] =
          await Promise.all([
            api.get("/barang-masuk"),
            api.get("/barang"),
          ]);

        if (cancelled) return;

        const masukData =
          normalizeArray<BarangMasuk>(
            masukResponse.data
          );

        const barangData =
          normalizeArray<Barang>(
            barangResponse.data
          );

        setData(masukData);
        setDataBarang(barangData);
      } catch (err: unknown) {
        if (cancelled) return;

        console.error(err);

        if (axios.isAxiosError(err)) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Gagal mengambil data barang masuk."
          );
        } else {
          setError(
            "Gagal mengambil data barang masuk."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     RESET FORM
  ========================================================= */

  const resetForm = () => {
    setForm({
      ...initialForm,
      tanggal: new Date()
        .toISOString()
        .split("T")[0],
    });

    setEditingId(null);
    setBarangDitemukan(null);
    setBarangBaru(false);
    setError("");
  };

  /* =========================================================
     GENERATE KODE BARANG BERIKUTNYA
  ========================================================= */

  const getNextKodeBarang = () => {
    const daftarBarang = Array.isArray(dataBarang)
      ? dataBarang
      : [];

    let maxNumber = 0;

    daftarBarang.forEach((item) => {
      const kode = String(
        item?.kode_barang ?? ""
      )
        .trim()
        .toUpperCase();

      const match = kode.match(/^BRG-(\d+)$/);

      if (match) {
        const number = Number(match[1]);

        if (Number.isFinite(number)) {
          maxNumber = Math.max(
            maxNumber,
            number
          );
        }
      }
    });

    return `BRG-${String(
      maxNumber + 1
    ).padStart(4, "0")}`;
  };

  /* =========================================================
     FORMAT KODE BARANG
  ========================================================= */

  const formatKodeBarang = (
    kode: string | null | undefined
  ) => {
    if (!kode) return "-";

    const value = String(kode).trim();

    const match = value.match(/(\d+)$/);

    if (!match) {
      return value.toUpperCase();
    }

    return `BRG-${match[1].padStart(4, "0")}`;
  };

  /* =========================================================
     FORMAT KONVERSI
  ========================================================= */

  const formatKonversi = (
    barang: Barang | null
  ) => {
    if (!barang) return "";

    const satuanMasuk =
      barang.satuan_masuk?.trim();

    const satuanKeluar =
      barang.satuan_keluar?.trim();

    const isi = barang.isi_per_satuan;

    if (
      satuanMasuk &&
      satuanKeluar &&
      satuanMasuk.toUpperCase() !==
        satuanKeluar.toUpperCase() &&
      isi
    ) {
      return `1 ${satuanMasuk} = ${Number(
        isi
      ).toLocaleString("id-ID")} ${satuanKeluar}`;
    }

    return `Satuan stok: ${
      satuanKeluar || satuanMasuk || "-"
    }`;
  };

  /* =========================================================
     OPEN ADD
  ========================================================= */

  const handleAdd = () => {
    const nextKode = getNextKodeBarang();

    setForm({
      ...initialForm,
      tanggal: new Date()
        .toISOString()
        .split("T")[0],
      kode_barang: nextKode,
    });

    setEditingId(null);
    setBarangDitemukan(null);
    setBarangBaru(true);

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  /* =========================================================
     CEK KODE BARANG
  ========================================================= */

  const handleKodeBarangChange = (
    value: string
  ) => {
    const kode = value.trim();

    const daftarBarang: Barang[] =
      Array.isArray(dataBarang)
        ? dataBarang
        : [];

    const barang = daftarBarang.find(
      (item) => {
        if (
          !item ||
          !item.kode_barang
        ) {
          return false;
        }

        return (
          String(item.kode_barang)
            .trim()
            .toLowerCase() ===
          kode.toLowerCase()
        );
      }
    );

    /* =====================================================
       KODE KOSONG
    ===================================================== */

    if (!kode) {
      setBarangDitemukan(null);
      setBarangBaru(false);

      setForm((prev) => ({
        ...prev,
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

    /* =====================================================
       BARANG SUDAH ADA
    ===================================================== */

    if (barang) {
      setBarangDitemukan(barang);
      setBarangBaru(false);

      setForm((prev) => ({
        ...prev,
        kode_barang: value,

        nama_barang:
          barang.nama_barang || "",

        detail_ukuran:
          barang.detail_ukuran || "",

        satuan_masuk:
          barang.satuan_masuk || "",

        isi_per_satuan:
          barang.isi_per_satuan !== null &&
          barang.isi_per_satuan !== undefined
            ? String(
                barang.isi_per_satuan
              )
            : "",

        satuan_keluar:
          barang.satuan_keluar || "PCS",

        stok_minimum:
          String(
            barang.stok_minimum ?? 0
          ),
      }));

      return;
    }

    /* =====================================================
       BARANG BARU
    ===================================================== */

    setBarangDitemukan(null);
    setBarangBaru(true);

    setForm((prev) => ({
      ...prev,
      kode_barang: value,

      nama_barang: "",
      detail_ukuran: "",

      satuan_masuk: "",
      isi_per_satuan: "",
      satuan_keluar: "PCS",

      stok_minimum: "0",
    }));
  };

  /* =========================================================
     INPUT FORM
  ========================================================= */

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    /* =====================================================
       VALIDASI
    ===================================================== */

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

    /* =====================================================
       KONVERSI WAJIB JIKA BUKAN PCS
    ===================================================== */

    if (
      form.satuan_masuk
        .trim()
        .toUpperCase() !== "PCS"
    ) {
      if (
        !form.isi_per_satuan ||
        Number(form.isi_per_satuan) <= 0
      ) {
        setError(
          `Isi per satuan wajib diisi untuk satuan ${form.satuan_masuk}.`
        );
        return;
      }
    }

    if (
      !form.jumlah ||
      Number(form.jumlah) <= 0
    ) {
      setError(
        "Jumlah barang harus lebih dari 0."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        tanggal: form.tanggal,

        kode_barang:
          form.kode_barang.trim(),

        nama_barang:
          form.nama_barang.trim(),

        detail_ukuran:
          form.detail_ukuran.trim() ||
          null,

        satuan_masuk:
          form.satuan_masuk.trim(),

        isi_per_satuan:
          form.satuan_masuk
            .trim()
            .toUpperCase() === "PCS"
            ? null
            : Number(
                form.isi_per_satuan
              ),

        satuan_keluar:
          form.satuan_keluar.trim(),

        stok_minimum:
          Number(
            form.stok_minimum || 0
          ),

        jumlah:
          Number(form.jumlah),

        supplier:
          form.supplier.trim() || null,

        keterangan:
          form.keterangan.trim() || null,
      };

      /* ===================================================
         EDIT
      =================================================== */

      if (editingId !== null) {
        await api.put(
          `/barang-masuk/${editingId}`,
          payload
        );

        setSuccess(
          "Barang masuk berhasil diperbarui."
        );
      }

      /* ===================================================
         TAMBAH
      =================================================== */

      else {
        await api.post(
          "/barang-masuk",
          payload
        );

        setSuccess(
          "Barang masuk berhasil ditambahkan."
        );
      }

      setShowModal(false);

      resetForm();

      await fetchData();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Terjadi kesalahan saat menyimpan data."
        );
      } else {
        setError(
          "Terjadi kesalahan saat menyimpan data."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const handleEdit = (
    item: BarangMasuk
  ) => {
    const daftarBarang: Barang[] =
      Array.isArray(dataBarang)
        ? dataBarang
        : [];

    const barang = daftarBarang.find(
      (b) => b.id === item.barang_id
    );

    setEditingId(item.id);

    setForm({
      tanggal: item.tanggal,

      kode_barang:
        item.kode_barang,

      nama_barang:
        item.nama_barang,

      detail_ukuran:
        item.detail_ukuran || "",

      satuan_masuk:
        barang?.satuan_masuk ||
        item.satuan ||
        "",

      isi_per_satuan:
        barang?.isi_per_satuan !== null &&
        barang?.isi_per_satuan !== undefined
          ? String(
              barang.isi_per_satuan
            )
          : "",

      satuan_keluar:
        barang?.satuan_keluar ||
        item.satuan_keluar ||
        "PCS",

      stok_minimum:
        barang
          ? String(
              barang.stok_minimum ?? 0
            )
          : "0",

      jumlah:
        String(item.jumlah),

      supplier:
        item.supplier || "",

      keterangan:
        item.keterangan || "",
    });

    setBarangDitemukan(
      barang || null
    );

    setBarangBaru(!barang);

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  /* =========================================================
     DETAIL
  ========================================================= */

  const handleDetail = (
    item: BarangMasuk
  ) => {
    setSelectedData(item);
    setShowDetail(true);
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async (
    item: BarangMasuk
  ) => {
    const confirmDelete =
      window.confirm(
        `Yakin ingin menghapus transaksi ${item.nomor_transaksi}?`
      );

    if (!confirmDelete) return;

    try {
      setError("");

      await api.delete(
        `/barang-masuk/${item.id}`
      );

      setSuccess(
        "Transaksi barang masuk berhasil dihapus."
      );

      await fetchData();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Gagal menghapus transaksi."
        );
      } else {
        setError(
          "Gagal menghapus transaksi."
        );
      }

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  /* =========================================================
     FILTER SEARCH

     useMemo hanya untuk menghitung data.
     Tidak ada setState di sini.
  ========================================================= */

  const filteredData = useMemo(() => {
    const keyword =
      search.toLowerCase().trim();

    if (!keyword) {
      return data;
    }

    return data.filter((item) => {
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
        item.supplier
          ?.toLowerCase()
          .includes(keyword) ||
        item.keterangan
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [data, search]);

  /* =========================================================
     SUMMARY
  ========================================================= */

  const totalTransaksi =
    data.length;

  /*
   * Total barang masuk menggunakan jumlah_dasar.
   * Jadi Pack/Dus/Box tetap dikonversi ke satuan stok.
   */
  const totalBarangMasuk =
    data.reduce(
      (total, item) =>
        total +
        Number(
          item.jumlah_dasar ??
            item.jumlah ??
            0
        ),
      0
    );

  const supplierCount =
    new Set(
      data
        .map(
          (item) => item.supplier
        )
        .filter(Boolean)
    ).size;

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredData.length /
        itemsPerPage
    )
  );

  /*
   * Jika search mengurangi jumlah halaman,
   * halaman aktif tetap aman ketika data ditampilkan.
   *
   * Tidak menggunakan useEffect.
   */
  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const startIndex =
    (safeCurrentPage - 1) *
    itemsPerPage;

  const paginatedData =
    filteredData.slice(
      startIndex,
      startIndex + itemsPerPage
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64">
        <Navbar />

        <main className="pt-20">
          <div className="p-8">

            {/* HEADER */}

            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-3">
                    <PackagePlus className="h-7 w-7 text-blue-600" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      Barang Masuk
                    </h1>

                    <p className="text-sm text-slate-500">
                      Kelola transaksi barang
                      yang masuk ke dalam stok
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAdd}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                Tambah Barang Masuk
              </button>
            </div>

            {/* SUCCESS */}

            {success && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                {success}
              </div>
            )}

            {/* ERROR */}

            {error && !showModal && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            {/* SUMMARY */}

            <div className="mb-8 grid grid-cols-3 gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Transaksi
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {totalTransaksi}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Barang Masuk
                </p>

                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {totalBarangMasuk.toLocaleString(
                    "id-ID"
                  )}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Dalam satuan stok
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">
                  Supplier
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {supplierCount}
                </h2>
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
                    placeholder="Cari kode, nama barang, transaksi..."
                    value={search}
                    onChange={(e) => {
                      setSearch(
                        e.target.value
                      );

                      /*
                       * Reset pagination langsung
                       * ketika user mengetik.
                       *
                       * Ini bukan useEffect,
                       * sehingga tidak terkena error
                       * cascading renders.
                       */
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* TABLE */}

              <div className="overflow-x-auto">

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="py-20 text-center">
                    <PackagePlus className="mx-auto mb-4 h-12 w-12 text-slate-300" />

                    <h3 className="text-lg font-semibold text-slate-700">
                      Belum ada transaksi
                      barang masuk
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Klik tombol Tambah Barang
                      Masuk untuk menambahkan
                      transaksi.
                    </p>
                  </div>
                ) : (
                  <table className="w-full min-w-[1250px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">
                          No
                        </th>

                        <th className="px-5 py-4">
                          Tanggal
                        </th>

                        <th className="px-5 py-4">
                          No. Transaksi
                        </th>

                        <th className="px-5 py-4">
                          Kode Barang
                        </th>

                        <th className="px-5 py-4">
                          Nama Barang
                        </th>

                        <th className="px-5 py-4">
                          Detail / Ukuran
                        </th>

                        <th className="px-5 py-4">
                          Jumlah
                        </th>

                        <th className="px-5 py-4">
                          Satuan
                        </th>

                        <th className="px-5 py-4">
                          Konversi
                        </th>

                        <th className="px-5 py-4">
                          Supplier
                        </th>

                        <th className="px-5 py-4">
                          Keterangan
                        </th>

                        <th className="px-5 py-4 text-center">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.map(
                        (
                          item,
                          index
                        ) => {
                          const barang =
                            dataBarang.find(
                              (b) =>
                                b.id ===
                                item.barang_id
                            );

                          return (
                            <tr
                              key={item.id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4 text-slate-600">
                                {startIndex +
                                  index +
                                  1}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-slate-700">
                                  <CalendarDays className="h-4 w-4 text-slate-400" />

                                  {item.tanggal}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-semibold text-blue-600">
                                  {
                                    item.nomor_transaksi
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                  {formatKodeBarang(
                                    item.kode_barang
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4 font-medium text-slate-800">
                                {
                                  item.nama_barang
                                }
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {
                                  item.detail_ukuran ||
                                  "-"
                                }
                              </td>

                              <td className="px-5 py-4 font-semibold text-slate-800">
                                {Number(
                                  item.jumlah
                                ).toLocaleString(
                                  "id-ID"
                                )}
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {item.satuan}
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {formatKonversi(
                                  barang ||
                                    (item.satuan_keluar
                                      ? {
                                          id: item.barang_id,
                                          kode_barang:
                                            item.kode_barang,
                                          nama_barang:
                                            item.nama_barang,
                                          detail_ukuran:
                                            item.detail_ukuran,
                                          satuan_masuk:
                                            item.satuan,
                                          isi_per_satuan:
                                            item.isi_per_satuan ??
                                            null,
                                          satuan_keluar:
                                            item.satuan_keluar,
                                          stok_minimum: 0,
                                        }
                                      : null)
                                )}
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {item.supplier ||
                                  "-"}
                              </td>

                              <td className="max-w-[200px] px-5 py-4 text-slate-600">
                                <span className="line-clamp-2">
                                  {item.keterangan ||
                                    "-"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-2">

                                  {/* DETAIL */}

                                  <button
                                    onClick={() =>
                                      handleDetail(
                                        item
                                      )
                                    }
                                    title="Lihat detail"
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  {/* EDIT */}

                                  <button
                                    onClick={() =>
                                      handleEdit(
                                        item
                                      )
                                    }
                                    title="Edit"
                                    className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  {/* DELETE */}

                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        item
                                      )
                                    }
                                    title="Hapus"
                                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>

                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                )}

                {/* PAGINATION */}

                {!loading &&
                  filteredData.length >
                    0 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">

                      <div className="text-sm text-slate-500">
                        Menampilkan{" "}
                        <span className="font-semibold text-slate-700">
                          {startIndex + 1}
                        </span>

                        {" - "}

                        <span className="font-semibold text-slate-700">
                          {Math.min(
                            startIndex +
                              itemsPerPage,
                            filteredData.length
                          )}
                        </span>

                        {" dari "}

                        <span className="font-semibold text-slate-700">
                          {
                            filteredData.length
                          }
                        </span>

                        {" data"}
                      </div>

                      <div className="flex items-center gap-2">

                        {/* SEBELUMNYA */}

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage(
                              (prev) =>
                                Math.max(
                                  prev - 1,
                                  1
                                )
                            )
                          }
                          disabled={
                            safeCurrentPage ===
                            1
                          }
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>

                        {/* NOMOR HALAMAN */}

                        <div className="flex items-center gap-1">
                          {Array.from(
                            {
                              length:
                                totalPages,
                            },
                            (
                              _,
                              index
                            ) =>
                              index + 1
                          ).map(
                            (page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() =>
                                  setCurrentPage(
                                    page
                                  )
                                }
                                className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                                  safeCurrentPage ===
                                  page
                                    ? "bg-blue-600 text-white"
                                    : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {page}
                              </button>
                            )
                          )}
                        </div>

                        {/* BERIKUTNYA */}

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage(
                              (prev) =>
                                Math.min(
                                  prev + 1,
                                  totalPages
                                )
                            )
                          }
                          disabled={
                            safeCurrentPage ===
                            totalPages
                          }
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Berikutnya
                        </button>

                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =====================================================
          MODAL TAMBAH / EDIT
      ===================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId !== null
                    ? "Edit Barang Masuk"
                    : "Tambah Barang Masuk"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Masukkan data transaksi
                  barang masuk
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6 p-6">

                {/* ERROR */}

                {error && (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* TANGGAL */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tanggal
                  </label>

                  <input
                    type="date"
                    name="tanggal"
                    value={form.tanggal}
                    onChange={
                      handleChange
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* NOMOR TRANSAKSI */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nomor Transaksi
                  </label>

                  <input
                    type="text"
                    value={
                      editingId !== null
                        ? data.find(
                            (item) =>
                              item.id ===
                              editingId
                          )
                            ?.nomor_transaksi ||
                          "-"
                        : "Otomatis dibuat oleh sistem"
                    }
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                  />
                </div>

                {/* KODE BARANG */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Kode Barang
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="kode_barang"
                    value={
                      form.kode_barang
                    }
                    onChange={(e) =>
                      handleKodeBarangChange(
                        e.target.value
                      )
                    }
                    placeholder="Contoh: BRG-0001"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium uppercase text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {barangDitemukan && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />

                      Barang sudah terdaftar.
                      Data barang otomatis
                      digunakan.
                    </div>
                  )}

                  {barangBaru &&
                    form.kode_barang.trim() && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                        <PackagePlus className="h-4 w-4" />

                        Kode barang belum
                        terdaftar. Data barang
                        baru akan dibuat.
                      </div>
                    )}
                </div>

                {/* NAMA BARANG */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Nama Barang
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="nama_barang"
                    value={
                      form.nama_barang
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      !!barangDitemukan
                    }
                    placeholder="Nama barang"
                    required
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                      barangDitemukan
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-300"
                    }`}
                  />
                </div>

                {/* SATUAN MASUK + ISI */}

                <div className="grid grid-cols-2 gap-5">

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Satuan Masuk
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      name="satuan_masuk"
                      value={
                        form.satuan_masuk
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        !!barangDitemukan
                      }
                      placeholder="PCS / PACK / BOX"
                      required
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                        barangDitemukan
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                          : "border-slate-300"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Isi per Satuan
                    </label>

                    <input
                      type="number"
                      name="isi_per_satuan"
                      value={
                        form.isi_per_satuan
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        !!barangDitemukan ||
                        form.satuan_masuk
                          .trim()
                          .toUpperCase() ===
                          "PCS"
                      }
                      min="1"
                      placeholder="Contoh: 25"
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                        barangDitemukan ||
                        form.satuan_masuk
                          .trim()
                          .toUpperCase() ===
                          "PCS"
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                          : "border-slate-300"
                      }`}
                    />

                    <p className="mt-1 text-xs text-slate-400">
                      Contoh: 1 Pack = 25 PCS
                    </p>
                  </div>
                </div>

                {/* SATUAN STOK */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Satuan Stok
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    name="satuan_keluar"
                    value={
                      form.satuan_keluar
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      !!barangDitemukan
                    }
                    placeholder="PCS"
                    required
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                      barangDitemukan
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-300"
                    }`}
                  />
                </div>

                {/* INFO KONVERSI */}

                {barangDitemukan && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
                      Konversi Stok
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {formatKonversi(
                        barangDitemukan
                      )}
                    </p>
                  </div>
                )}

                {/* DETAIL / UKURAN */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Detail / Ukuran
                  </label>

                  <input
                    type="text"
                    name="detail_ukuran"
                    value={
                      form.detail_ukuran
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      !!barangDitemukan
                    }
                    placeholder="Contoh: Ukuran L / 10 Meter"
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                      barangDitemukan
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-300"
                    }`}
                  />
                </div>

                {/* STOK MINIMUM */}

                {barangBaru && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Batas Minimum Stok
                    </label>

                    <input
                      type="number"
                      name="stok_minimum"
                      value={
                        form.stok_minimum
                      }
                      onChange={
                        handleChange
                      }
                      min="0"
                      placeholder="Contoh: 10"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-1 text-xs text-slate-400">
                      Digunakan untuk menentukan
                      status stok Menipis.
                    </p>
                  </div>
                )}

                {/* JUMLAH */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Jumlah Barang Masuk
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    name="jumlah"
                    value={
                      form.jumlah
                    }
                    onChange={
                      handleChange
                    }
                    min="1"
                    placeholder={`Masukkan jumlah ${form.satuan_masuk || "barang"}`}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {form.jumlah &&
                    form.satuan_masuk && (
                      <p className="mt-2 text-xs text-slate-500">
                        Jumlah masuk:{" "}
                        <span className="font-semibold text-slate-700">
                          {Number(
                            form.jumlah
                          ).toLocaleString(
                            "id-ID"
                          )}{" "}
                          {
                            form.satuan_masuk
                          }
                        </span>

                        {form.satuan_masuk
                          .trim()
                          .toUpperCase() !==
                          "PCS" &&
                          form.isi_per_satuan && (
                            <>
                              {" → "}
                              <span className="font-semibold text-blue-600">
                                {(
                                  Number(
                                    form.jumlah
                                  ) *
                                  Number(
                                    form.isi_per_satuan
                                  )
                                ).toLocaleString(
                                  "id-ID"
                                )}{" "}
                                {
                                  form.satuan_keluar
                                }
                              </span>
                            </>
                          )}
                      </p>
                    )}
                </div>

                {/* SUPPLIER */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Supplier
                  </label>

                  <input
                    type="text"
                    name="supplier"
                    value={
                      form.supplier
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Nama supplier"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* KETERANGAN */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Keterangan
                  </label>

                  <textarea
                    name="keterangan"
                    value={
                      form.keterangan
                    }
                    onChange={
                      handleChange
                    }
                    rows={3}
                    placeholder="Keterangan tambahan..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* =====================================================
          MODAL DETAIL
      ===================================================== */}

      {showDetail &&
        selectedData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">

            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Detail Barang Masuk
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {
                      selectedData.nomor_transaksi
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDetail(false)
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* DETAIL CONTENT */}

              <div className="grid grid-cols-2 gap-5 p-6">

                <DetailItem
                  label="Tanggal"
                  value={
                    selectedData.tanggal
                  }
                />

                <DetailItem
                  label="Nomor Transaksi"
                  value={
                    selectedData.nomor_transaksi
                  }
                />

                <DetailItem
                  label="Kode Barang"
                  value={formatKodeBarang(
                    selectedData.kode_barang
                  )}
                />

                <DetailItem
                  label="Nama Barang"
                  value={
                    selectedData.nama_barang
                  }
                />

                <DetailItem
                  label="Detail / Ukuran"
                  value={
                    selectedData.detail_ukuran ||
                    "-"
                  }
                />

                <DetailItem
                  label="Jumlah Masuk"
                  value={`${Number(
                    selectedData.jumlah
                  ).toLocaleString(
                    "id-ID"
                  )} ${
                    selectedData.satuan
                  }`}
                />

                <DetailItem
                  label="Jumlah Stok"
                  value={`${Number(
                    selectedData.jumlah_dasar ??
                      selectedData.jumlah
                  ).toLocaleString(
                    "id-ID"
                  )} ${
                    selectedData.satuan_keluar ||
                    "PCS"
                  }`}
                />

                <DetailItem
                  label="Konversi"
                  value={
                    selectedData.satuan_keluar &&
                    selectedData.isi_per_satuan
                      ? `1 ${selectedData.satuan} = ${Number(
                          selectedData.isi_per_satuan
                        ).toLocaleString(
                          "id-ID"
                        )} ${selectedData.satuan_keluar}`
                      : selectedData.satuan
                  }
                />

                <DetailItem
                  label="Supplier"
                  value={
                    selectedData.supplier ||
                    "-"
                  }
                />

                <DetailItem
                  label="Keterangan"
                  value={
                    selectedData.keterangan ||
                    "-"
                  }
                />
              </div>

              {/* FOOTER */}

              <div className="flex justify-end border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowDetail(false)
                  }
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

/* =========================================================
   DETAIL ITEM
========================================================= */

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

      <p className="text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}
