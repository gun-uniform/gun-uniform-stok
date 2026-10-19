"use client";

import { useState } from "react";
import {
  Package,
  PackagePlus,
  PackageMinus,
  BarChart3,
  FileText,
  ArrowRight,
  CalendarDays,
  Download,
  Search,
  Loader2,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  total_masuk?: number;
  total_keluar?: number;
  sisa_stok?: number;
  status_stok?: string;
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
  satuan_keluar?: string;
  isi_per_satuan?: number | null;
  tujuan: string;
  keterangan: string | null;
}

type JenisLaporan =
  | "stok"
  | "masuk"
  | "keluar"
  | "rekap";

const laporan = [
  {
    id: "stok" as JenisLaporan,
    number: 1,
    title: "Laporan Stok",
    description: "Melihat kondisi stok barang terkini di gudang.",
    icon: Package,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "masuk" as JenisLaporan,
    number: 2,
    title: "Laporan Barang Masuk",
    description: "Melihat rekap seluruh transaksi barang yang masuk.",
    icon: PackagePlus,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    buttonColor: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "keluar" as JenisLaporan,
    number: 3,
    title: "Laporan Barang Keluar",
    description: "Melihat rekap seluruh transaksi barang yang keluar.",
    icon: PackageMinus,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    buttonColor: "bg-red-600 hover:bg-red-700",
  },
  {
    id: "rekap" as JenisLaporan,
    number: 4,
    title: "Rekapitulasi Stok",
    description:
      "Melihat perbandingan stok awal, barang masuk, barang keluar, dan stok akhir.",
    icon: BarChart3,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
  },
];

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

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const getFirstDayOfMonth = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
};

const formatNumber = (value: number | string | null | undefined) => {
  return Number(value || 0).toLocaleString("id-ID");
};

const formatTanggal = (tanggal: string) => {
  if (!tanggal) return "-";

  const date = new Date(tanggal);

  if (isNaN(date.getTime())) {
    return tanggal;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTanggalPDF = (tanggal: string) => {
  if (!tanggal) return "-";

  const date = new Date(tanggal);

  if (isNaN(date.getTime())) {
    return tanggal;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function LaporanPage() {
  const [tanggalMulai, setTanggalMulai] = useState(getFirstDayOfMonth());
  const [tanggalAkhir, setTanggalAkhir] = useState(getToday());

  const [jenisLaporan, setJenisLaporan] =
    useState<JenisLaporan>("stok");

  const [dataBarang, setDataBarang] = useState<Barang[]>([]);
  const [dataBarangMasuk, setDataBarangMasuk] = useState<BarangMasuk[]>([]);
  const [dataBarangKeluar, setDataBarangKeluar] = useState<BarangKeluar[]>(
    []
  );

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  const [search, setSearch] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | TAMPILKAN LAPORAN
  |--------------------------------------------------------------------------
  */

  const handleTampilkanLaporan = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!tanggalMulai || !tanggalAkhir) {
      setErrorMessage("Tanggal mulai dan tanggal akhir wajib diisi.");
      return;
    }

    if (tanggalMulai > tanggalAkhir) {
      setErrorMessage(
        "Tanggal mulai tidak boleh lebih besar dari tanggal akhir."
      );
      return;
    }

    try {
      setLoading(true);

      const [barangResponse, masukResponse, keluarResponse] =
        await Promise.all([
          api.get("/barang"),
          api.get("/barang-masuk"),
          api.get("/barang-keluar"),
        ]);

      const barangData = normalizeArray<Barang>(barangResponse.data);

      const masukData = normalizeArray<BarangMasuk>(
        masukResponse.data
      );

      const keluarData = normalizeArray<BarangKeluar>(
        keluarResponse.data
      );

      setDataBarang(barangData);

      /*
      |--------------------------------------------------------------------------
      | FILTER PERIODE
      |--------------------------------------------------------------------------
      */

      const masukFiltered = masukData.filter((item) => {
        const tanggal = item.tanggal?.substring(0, 10);

        return tanggal >= tanggalMulai && tanggal <= tanggalAkhir;
      });

      const keluarFiltered = keluarData.filter((item) => {
        const tanggal = item.tanggal?.substring(0, 10);

        return tanggal >= tanggalMulai && tanggal <= tanggalAkhir;
      });

      setDataBarangMasuk(masukFiltered);
      setDataBarangKeluar(keluarFiltered);

      setShowPreview(true);

      setSuccessMessage("Laporan berhasil ditampilkan.");
    } catch (error: unknown) {
      console.error("Gagal mengambil data laporan:", error);

      setErrorMessage(
        "Gagal mengambil data laporan dari server. Periksa koneksi backend."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER DATA PREVIEW
  |--------------------------------------------------------------------------
  */

  const filteredBarang = dataBarang.filter((item) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      item.kode_barang?.toLowerCase().includes(keyword) ||
      item.nama_barang?.toLowerCase().includes(keyword) ||
      item.detail_ukuran?.toLowerCase().includes(keyword)
    );
  });

  const filteredMasuk = dataBarangMasuk.filter((item) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      item.nomor_transaksi?.toLowerCase().includes(keyword) ||
      item.kode_barang?.toLowerCase().includes(keyword) ||
      item.nama_barang?.toLowerCase().includes(keyword) ||
      item.supplier?.toLowerCase().includes(keyword)
    );
  });

  const filteredKeluar = dataBarangKeluar.filter((item) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      item.nomor_transaksi?.toLowerCase().includes(keyword) ||
      item.kode_barang?.toLowerCase().includes(keyword) ||
      item.nama_barang?.toLowerCase().includes(keyword) ||
      item.tujuan?.toLowerCase().includes(keyword)
    );
  });

  /*
  |--------------------------------------------------------------------------
  | DATA REKAP
  |--------------------------------------------------------------------------
  */

  const getRekapData = () => {
    return dataBarang.map((barang) => {
      const masuk = dataBarangMasuk
        .filter((item) => item.barang_id === barang.id)
        .reduce(
          (total, item) => total + Number(item.jumlah_dasar || 0),
          0
        );

      const keluar = dataBarangKeluar
        .filter((item) => item.barang_id === barang.id)
        .reduce(
          (total, item) => total + Number(item.jumlah_dasar || 0),
          0
        );

      const stokAkhir = Number(barang.sisa_stok || 0);

      const stokAwal = stokAkhir - masuk + keluar;

      return {
        ...barang,
        stok_awal: stokAwal,
        masuk,
        keluar,
        stok_akhir: stokAkhir,
      };
    });
  };

  const rekapData = getRekapData();

  /*
  |--------------------------------------------------------------------------
  | DOWNLOAD PDF
  |--------------------------------------------------------------------------
  */

  const handleDownloadPDF = async () => {
    if (!showPreview) {
      setErrorMessage("Tampilkan laporan terlebih dahulu.");
      return;
    }

    try {
      setDownloading(true);
      setErrorMessage("");

      const doc = new jsPDF({
        orientation:
          jenisLaporan === "masuk" ||
          jenisLaporan === "keluar" ||
          jenisLaporan === "rekap"
            ? "landscape"
            : "portrait",
        unit: "mm",
        format: "a4",
      });

      const selectedReport = laporan.find(
        (item) => item.id === jenisLaporan
      );

      const reportTitle =
        selectedReport?.title || "Laporan Persediaan Barang";

      /*
      |--------------------------------------------------------------------------
      | HEADER PDF
      |--------------------------------------------------------------------------
      */

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN PERSEDIAAN BARANG", 14, 18);

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.text(reportTitle, 14, 26);

      doc.setFontSize(9);
      doc.text(
        `Periode: ${formatTanggalPDF(
          tanggalMulai
        )} - ${formatTanggalPDF(tanggalAkhir)}`,
        14,
        33
      );

      doc.text(
        `Dicetak: ${formatTanggalPDF(new Date().toISOString())}`,
        14,
        39
      );

      /*
      |--------------------------------------------------------------------------
      | LAPORAN STOK
      |--------------------------------------------------------------------------
      */

      if (jenisLaporan === "stok") {
        autoTable(doc, {
          startY: 46,
          head: [
            [
              "No",
              "Kode Barang",
              "Nama Barang",
              "Detail / Ukuran",
              "Satuan Masuk",
              "Isi / Satuan",
              "Satuan Keluar",
              "Stok",
              "Minimum",
              "Status",
            ],
          ],
          body: filteredBarang.map((barang, index) => [
            index + 1,
            barang.kode_barang,
            barang.nama_barang,
            barang.detail_ukuran || "-",
            barang.satuan_masuk,
            barang.isi_per_satuan
              ? formatNumber(barang.isi_per_satuan)
              : "-",
            barang.satuan_keluar,
            formatNumber(barang.sisa_stok),
            formatNumber(barang.stok_minimum),
            barang.status_stok || "-",
          ]),
          styles: {
            fontSize: 7,
            cellPadding: 2,
          },
          headStyles: {
            fontStyle: "bold",
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | LAPORAN BARANG MASUK
      |--------------------------------------------------------------------------
      */

      if (jenisLaporan === "masuk") {
        autoTable(doc, {
          startY: 46,
          head: [
            [
              "No",
              "Tanggal",
              "No. Transaksi",
              "Kode",
              "Nama Barang",
              "Detail",
              "Jumlah",
              "Satuan",
              "Jumlah Stok",
              "Supplier",
              "Keterangan",
            ],
          ],
          body: filteredMasuk.map((item, index) => [
            index + 1,
            formatTanggal(item.tanggal),
            item.nomor_transaksi,
            item.kode_barang,
            item.nama_barang,
            item.detail_ukuran || "-",
            formatNumber(item.jumlah),
            item.satuan,
            `${formatNumber(item.jumlah_dasar)} ${
              item.satuan_keluar || "PCS"
            }`,
            item.supplier || "-",
            item.keterangan || "-",
          ]),
          styles: {
            fontSize: 7,
            cellPadding: 2,
          },
          headStyles: {
            fontStyle: "bold",
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | LAPORAN BARANG KELUAR
      |--------------------------------------------------------------------------
      */

      if (jenisLaporan === "keluar") {
        autoTable(doc, {
          startY: 46,
          head: [
            [
              "No",
              "Tanggal",
              "No. Transaksi",
              "Kode",
              "Nama Barang",
              "Detail",
              "Jumlah",
              "Satuan",
              "Jumlah Stok",
              "Tujuan",
              "Keterangan",
            ],
          ],
          body: filteredKeluar.map((item, index) => [
            index + 1,
            formatTanggal(item.tanggal),
            item.nomor_transaksi,
            item.kode_barang,
            item.nama_barang,
            item.detail_ukuran || "-",
            formatNumber(item.jumlah),
            item.satuan,
            `${formatNumber(item.jumlah_dasar)} ${
              item.satuan_keluar || "PCS"
            }`,
            item.tujuan || "-",
            item.keterangan || "-",
          ]),
          styles: {
            fontSize: 7,
            cellPadding: 2,
          },
          headStyles: {
            fontStyle: "bold",
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | REKAPITULASI STOK
      |--------------------------------------------------------------------------
      */

      if (jenisLaporan === "rekap") {
        autoTable(doc, {
          startY: 46,
          head: [
            [
              "No",
              "Kode Barang",
              "Nama Barang",
              "Satuan",
              "Stok Awal",
              "Barang Masuk",
              "Barang Keluar",
              "Stok Akhir",
              "Status",
            ],
          ],
          body: rekapData
            .filter((item) => {
              const keyword = search.toLowerCase().trim();

              if (!keyword) return true;

              return (
                item.kode_barang
                  ?.toLowerCase()
                  .includes(keyword) ||
                item.nama_barang
                  ?.toLowerCase()
                  .includes(keyword) ||
                item.detail_ukuran
                  ?.toLowerCase()
                  .includes(keyword)
              );
            })
            .map((item, index) => [
              index + 1,
              item.kode_barang,
              item.nama_barang,
              item.satuan_keluar,
              formatNumber(item.stok_awal),
              formatNumber(item.masuk),
              formatNumber(item.keluar),
              formatNumber(item.stok_akhir),
              item.status_stok || "-",
            ]),
          styles: {
            fontSize: 8,
            cellPadding: 2.5,
          },
          headStyles: {
            fontStyle: "bold",
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FOOTER
      |--------------------------------------------------------------------------
      */

      const pageCount = doc.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);

        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");

        doc.text(
          `Laporan Persediaan Barang - Halaman ${page} dari ${pageCount}`,
          14,
          pageHeight - 8
        );
      }

      const fileName = `laporan-${jenisLaporan}-${tanggalMulai}-${tanggalAkhir}.pdf`;

      doc.save(fileName);

      setSuccessMessage("Laporan PDF berhasil dibuat.");
    } catch (error: unknown) {
      console.error("Gagal membuat PDF:", error);

      setErrorMessage(
        "Gagal membuat file PDF. Silakan coba lagi."
      );
    } finally {
      setDownloading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RESET PREVIEW
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {
    setShowPreview(false);
    setSearch("");
    setErrorMessage("");
    setSuccessMessage("");
    setDataBarang([]);
    setDataBarangMasuk([]);
    setDataBarangKeluar([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="ml-64">
        <Navbar />

        <main className="pt-20">
          <div className="p-4 md:p-6 lg:p-8">
            {/* HEADER */}
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <FileText size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Laporan
                  </h1>

                  <p className="text-sm text-gray-500">
                    Kelola dan lihat berbagai laporan persediaan barang
                  </p>
                </div>
              </div>
            </div>

            {/* ERROR GLOBAL */}
            {errorMessage && (
              <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{errorMessage}</span>

                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* SUCCESS */}
            {successMessage && (
              <div className="mb-5 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <span>{successMessage}</span>

                <button
                  type="button"
                  onClick={() => setSuccessMessage("")}
                  className="text-green-500 hover:text-green-700"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* FILTER PERIODE */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Periode Laporan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Pilih periode untuk melihat laporan berdasarkan tanggal
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* TANGGAL MULAI */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tanggal Mulai
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="date"
                      value={tanggalMulai}
                      onChange={(e) =>
                        setTanggalMulai(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* TANGGAL AKHIR */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tanggal Akhir
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="date"
                      value={tanggalAkhir}
                      onChange={(e) =>
                        setTanggalAkhir(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* BUTTON */}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleTampilkanLaporan}
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Memuat...
                      </>
                    ) : (
                      <>
                        <FileText size={18} />
                        Tampilkan Laporan
                      </>
                    )}
                  </button>

                  {showPreview && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION JENIS LAPORAN */}
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Pilih Jenis Laporan
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Pilih jenis laporan yang ingin kamu lihat
              </p>
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {laporan.map((item) => {
                const Icon = item.icon;

                const active = jenisLaporan === item.id;

                return (
                  <div
                    key={item.id}
                    className={`group rounded-xl border bg-white p-6 shadow-sm transition duration-200 ${
                      active
                        ? "border-blue-400 ring-2 ring-blue-100"
                        : "border-gray-200 hover:-translate-y-1 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor}`}
                      >
                        <Icon size={27} />
                      </div>

                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          active
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {item.number}
                      </span>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.title}
                      </h3>

                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-gray-500">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() =>
                          setJenisLaporan(item.id)
                        }
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${item.buttonColor}`}
                      >
                        {active ? "Dipilih" : "Pilih Laporan"}

                        <ArrowRight
                          size={17}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PREVIEW */}
            {showPreview && (
              <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* PREVIEW HEADER */}
                <div className="border-b border-gray-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Preview Laporan
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {
                          laporan.find(
                            (item) => item.id === jenisLaporan
                          )?.title
                        }{" "}
                        — {formatTanggal(tanggalMulai)} s/d{" "}
                        {formatTanggal(tanggalAkhir)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative">
                        <Search
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          value={search}
                          onChange={(e) =>
                            setSearch(e.target.value)
                          }
                          placeholder="Cari data..."
                          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloading ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                            Membuat PDF...
                          </>
                        ) : (
                          <>
                            <Download size={17} />
                            Download PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* LAPORAN STOK */}
                {jenisLaporan === "stok" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-5 py-4">No</th>
                          <th className="px-5 py-4">Kode Barang</th>
                          <th className="px-5 py-4">Nama Barang</th>
                          <th className="px-5 py-4">Detail / Ukuran</th>
                          <th className="px-5 py-4 text-center">
                            Satuan Masuk
                          </th>
                          <th className="px-5 py-4 text-center">
                            Isi
                          </th>
                          <th className="px-5 py-4 text-center">
                            Satuan Keluar
                          </th>
                          <th className="px-5 py-4 text-center">
                            Stok
                          </th>
                          <th className="px-5 py-4 text-center">
                            Minimum
                          </th>
                          <th className="px-5 py-4 text-center">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredBarang.length > 0 ? (
                          filteredBarang.map((barang, index) => (
                            <tr
                              key={barang.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-4 text-gray-500">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4 font-medium text-gray-700">
                                {barang.kode_barang}
                              </td>

                              <td className="px-5 py-4 font-semibold text-gray-900">
                                {barang.nama_barang}
                              </td>

                              <td className="px-5 py-4 text-gray-600">
                                {barang.detail_ukuran || "-"}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {barang.satuan_masuk}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {barang.isi_per_satuan
                                  ? formatNumber(
                                      barang.isi_per_satuan
                                    )
                                  : "-"}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {barang.satuan_keluar}
                              </td>

                              <td className="px-5 py-4 text-center font-bold text-blue-600">
                                {formatNumber(
                                  barang.sisa_stok
                                )}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {formatNumber(
                                  barang.stok_minimum
                                )}
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                  {barang.status_stok || "-"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-5 py-12 text-center text-gray-500"
                            >
                              Data stok tidak ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* LAPORAN BARANG MASUK */}
                {jenisLaporan === "masuk" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-5 py-4">No</th>
                          <th className="px-5 py-4">Tanggal</th>
                          <th className="px-5 py-4">No. Transaksi</th>
                          <th className="px-5 py-4">Kode</th>
                          <th className="px-5 py-4">Nama Barang</th>
                          <th className="px-5 py-4">Jumlah</th>
                          <th className="px-5 py-4 text-center">
                            Stok Dasar
                          </th>
                          <th className="px-5 py-4">Supplier</th>
                          <th className="px-5 py-4">
                            Keterangan
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredMasuk.length > 0 ? (
                          filteredMasuk.map((item, index) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-4 text-gray-500">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4 whitespace-nowrap">
                                {formatTanggal(item.tanggal)}
                              </td>

                              <td className="px-5 py-4 font-semibold text-green-600">
                                {item.nomor_transaksi}
                              </td>

                              <td className="px-5 py-4">
                                {item.kode_barang}
                              </td>

                              <td className="px-5 py-4 font-semibold">
                                {item.nama_barang}
                              </td>

                              <td className="px-5 py-4 font-semibold text-green-600">
                                +{formatNumber(item.jumlah)}{" "}
                                {item.satuan}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {formatNumber(
                                  item.jumlah_dasar
                                )}{" "}
                                {item.satuan_keluar || "PCS"}
                              </td>

                              <td className="px-5 py-4">
                                {item.supplier || "-"}
                              </td>

                              <td className="px-5 py-4 text-gray-500">
                                {item.keterangan || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-5 py-12 text-center text-gray-500"
                            >
                              Tidak ada transaksi barang masuk
                              pada periode ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* LAPORAN BARANG KELUAR */}
                {jenisLaporan === "keluar" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-5 py-4">No</th>
                          <th className="px-5 py-4">Tanggal</th>
                          <th className="px-5 py-4">No. Transaksi</th>
                          <th className="px-5 py-4">Kode</th>
                          <th className="px-5 py-4">Nama Barang</th>
                          <th className="px-5 py-4">Jumlah</th>
                          <th className="px-5 py-4 text-center">
                            Stok Dasar
                          </th>
                          <th className="px-5 py-4">Tujuan</th>
                          <th className="px-5 py-4">
                            Keterangan
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {filteredKeluar.length > 0 ? (
                          filteredKeluar.map((item, index) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-4 text-gray-500">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4 whitespace-nowrap">
                                {formatTanggal(item.tanggal)}
                              </td>

                              <td className="px-5 py-4 font-semibold text-red-600">
                                {item.nomor_transaksi}
                              </td>

                              <td className="px-5 py-4">
                                {item.kode_barang}
                              </td>

                              <td className="px-5 py-4 font-semibold">
                                {item.nama_barang}
                              </td>

                              <td className="px-5 py-4 font-semibold text-red-600">
                                -{formatNumber(item.jumlah)}{" "}
                                {item.satuan}
                              </td>

                              <td className="px-5 py-4 text-center">
                                -{formatNumber(item.jumlah_dasar)}{" "}
                                {item.satuan_keluar || "PCS"}
                              </td>

                              <td className="px-5 py-4">
                                {item.tujuan || "-"}
                              </td>

                              <td className="px-5 py-4 text-gray-500">
                                {item.keterangan || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-5 py-12 text-center text-gray-500"
                            >
                              Tidak ada transaksi barang keluar
                              pada periode ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* REKAPITULASI */}
                {jenisLaporan === "rekap" && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="px-5 py-4">No</th>
                          <th className="px-5 py-4">Kode Barang</th>
                          <th className="px-5 py-4">Nama Barang</th>
                          <th className="px-5 py-4 text-center">
                            Satuan
                          </th>
                          <th className="px-5 py-4 text-center">
                            Stok Awal
                          </th>
                          <th className="px-5 py-4 text-center">
                            Barang Masuk
                          </th>
                          <th className="px-5 py-4 text-center">
                            Barang Keluar
                          </th>
                          <th className="px-5 py-4 text-center">
                            Stok Akhir
                          </th>
                          <th className="px-5 py-4 text-center">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {rekapData
                          .filter((item) => {
                            const keyword =
                              search.toLowerCase().trim();

                            if (!keyword) return true;

                            return (
                              item.kode_barang
                                ?.toLowerCase()
                                .includes(keyword) ||
                              item.nama_barang
                                ?.toLowerCase()
                                .includes(keyword) ||
                              item.detail_ukuran
                                ?.toLowerCase()
                                .includes(keyword)
                            );
                          })
                          .map((item, index) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-5 py-4 text-gray-500">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4 font-medium">
                                {item.kode_barang}
                              </td>

                              <td className="px-5 py-4 font-semibold text-gray-900">
                                {item.nama_barang}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {item.satuan_keluar}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {formatNumber(item.stok_awal)}
                              </td>

                              <td className="px-5 py-4 text-center font-semibold text-green-600">
                                +{formatNumber(item.masuk)}
                              </td>

                              <td className="px-5 py-4 text-center font-semibold text-red-600">
                                -{formatNumber(item.keluar)}
                              </td>

                              <td className="px-5 py-4 text-center font-bold text-blue-600">
                                {formatNumber(item.stok_akhir)}
                              </td>

                              <td className="px-5 py-4 text-center">
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                  {item.status_stok || "-"}
                                </span>
                              </td>
                            </tr>
                          ))}

                        {rekapData.filter((item) => {
                          const keyword =
                            search.toLowerCase().trim();

                          if (!keyword) return true;

                          return (
                            item.kode_barang
                              ?.toLowerCase()
                              .includes(keyword) ||
                            item.nama_barang
                              ?.toLowerCase()
                              .includes(keyword) ||
                            item.detail_ukuran
                              ?.toLowerCase()
                              .includes(keyword)
                          );
                        }).length === 0 && (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-5 py-12 text-center text-gray-500"
                            >
                              Data rekapitulasi tidak ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* FOOTER PREVIEW */}
                <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
                  <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Periode:{" "}
                      <strong className="text-gray-700">
                        {formatTanggal(tanggalMulai)}
                      </strong>{" "}
                      s/d{" "}
                      <strong className="text-gray-700">
                        {formatTanggal(tanggalAkhir)}
                      </strong>
                    </span>

                    <span>
                      Data menggunakan satuan stok dasar untuk
                      perhitungan.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* INFORMASI */}
            {!showPreview && (
              <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <FileText size={19} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">
                      Informasi Laporan
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-blue-700">
                      Pilih periode laporan terlebih dahulu,
                      kemudian klik{" "}
                      <strong>Tampilkan Laporan</strong>. Setelah
                      laporan muncul, pilih jenis laporan yang
                      dibutuhkan dan gunakan tombol{" "}
                      <strong>Download PDF</strong> untuk
                      menyimpan laporan.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
