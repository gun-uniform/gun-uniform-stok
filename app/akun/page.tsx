
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  UserPlus,
  Search,
  Eye,
  EyeOff,
  Trash2,
  X,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Pencil,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";

import AppSidebar from "@/component/layout/Sidebar";
import AppNavbar from "@/component/layout/Navbar";
import api from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface StoredUser {
  id?: number;
  role?: string;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
}

const initialForm: FormData = {
  name: "",
  email: "",
  password: "",
  role: "gudang",
};

const formatRole = (role: string) => {
  if (!role) return "-";

  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const error = err as ApiError;
  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 401) {
    return "Sesi login tidak valid atau sudah berakhir. Silakan login kembali.";
  }

  if (status === 403) {
    return "Akses ditolak. Periksa role akun dan izin API Laravel.";
  }

  if (status === 404) {
    return "Endpoint API tidak ditemukan. Periksa routes/api.php.";
  }

  if (status === 422 && data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  return data?.message || fallback;
};

export default function AkunPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<FormData>({ ...initialForm });
  const [search, setSearch] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = currentUserRole === "admin";
  const canViewUsers =
    currentUserRole === "admin" || currentUserRole === "pimpinan";

  // Baca informasi akun yang sedang login.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setCurrentUserRole(null);
        setCurrentUserId(null);
        return;
      }

      const parsedUser: StoredUser = JSON.parse(storedUser);

      setCurrentUserId(
        parsedUser.id != null ? Number(parsedUser.id) : null
      );

      setCurrentUserRole(
        typeof parsedUser.role === "string"
          ? parsedUser.role.toLowerCase()
          : null
      );
    } catch {
      setCurrentUserRole(null);
      setCurrentUserId(null);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  // Ambil daftar akun untuk Admin dan Pimpinan saja.
  const fetchUsers = useCallback(async () => {
    if (!canViewUsers) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/users");
      const result = response.data?.data ?? response.data;

      if (!Array.isArray(result)) {
        throw new Error("Format data user dari API tidak sesuai.");
      }

      setUsers(result);
    } catch (err: unknown) {
      console.error("Gagal mengambil data user:", err);

      setError(
        getErrorMessage(
          err,
          "Gagal mengambil data user. Periksa koneksi API Laravel."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [canViewUsers]);

  useEffect(() => {
    if (checkingRole) return;

    if (canViewUsers) {
      void fetchUsers();
    } else {
      setLoading(false);
      setUsers([]);
    }
  }, [checkingRole, canViewUsers, fetchUsers]);

  // Modal tambah akun.
  const handleOpenModal = () => {
    if (!isAdmin) return;

    setEditingUser(null);
    setForm({ ...initialForm });
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowModal(true);
  };

  // Modal edit akun.
  const handleOpenEdit = (user: User) => {
    if (!isAdmin) return;

    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });

    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowModal(true);
  };

  // Tutup modal.
  const handleCloseModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingUser(null);
    setForm({ ...initialForm });
    setError("");
    setShowPassword(false);
  };

  // Simpan akun baru atau perubahan akun.
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAdmin) {
      setError("Hanya Admin yang dapat mengelola akun.");
      return;
    }

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      setError("Nama dan email wajib diisi.");
      return;
    }

    if (!editingUser && !form.password) {
      setError("Password wajib diisi untuk akun baru.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (!["admin", "gudang", "pimpinan"].includes(form.role)) {
      setError("Role yang dipilih tidak valid.");
      return;
    }

    const payload: {
      name: string;
      email: string;
      role: string;
      password?: string;
    } = {
      name,
      email,
      role: form.role,
    };

    if (form.password) {
      payload.password = form.password;
    }

    setSaving(true);

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        setSuccess(`Akun ${name} berhasil diperbarui.`);
      } else {
        await api.post("/users", payload);
        setSuccess(`Akun ${name} berhasil ditambahkan.`);
      }

      setShowModal(false);
      setEditingUser(null);
      setForm({ ...initialForm });
      setShowPassword(false);

      await fetchUsers();
    } catch (err: unknown) {
      console.error("Gagal menyimpan user:", err);

      setError(
        getErrorMessage(
          err,
          "Gagal menyimpan akun. Periksa konfigurasi API Laravel."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // Hapus akun.
  const handleDelete = async (user: User) => {
    if (!isAdmin) {
      setError("Hanya Admin yang dapat menghapus akun.");
      return;
    }

    if (user.id === currentUserId) {
      setError("Akun yang sedang kamu gunakan tidak bisa dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin menghapus akun "${user.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(user.id);

    try {
      await api.delete(`/users/${user.id}`);

      setUsers((previous) =>
        previous.filter((item) => item.id !== user.id)
      );

      setSuccess(`Akun ${user.name} berhasil dihapus.`);
    } catch (err: unknown) {
      console.error("Gagal menghapus user:", err);

      setError(
        getErrorMessage(
          err,
          "Gagal menghapus akun. Periksa endpoint Laravel."
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const keyword = search.toLowerCase().trim();

    return (
      String(user.id).includes(keyword) ||
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.role.toLowerCase().includes(keyword)
    );
  });

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base font-medium text-black outline-none placeholder:text-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const labelClass = "mb-2 block text-base font-semibold text-black";

  // Tunggu sampai role selesai diperiksa.
  if (checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-700">
          <LoaderCircle size={24} className="animate-spin" />
          Memeriksa hak akses...
        </div>
      </div>
    );
  }

  // Gudang atau akun tanpa role yang diizinkan tidak boleh masuk.
  if (!canViewUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <LockKeyhole size={32} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Akses Ditolak
          </h1>

          <p className="mt-3 text-base leading-7 text-gray-600">
            Akun kamu tidak memiliki izin untuk membuka halaman Manajemen Akun.
            Halaman ini hanya dapat diakses oleh Admin dan Pimpinan.
          </p>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <AppSidebar />

      <div className="ml-64 min-h-screen">
        <AppNavbar />

        <main className="px-6 pb-10 pt-24">
          {/* Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <UserRound size={28} />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-black">
                  Manajemen Akun
                </h1>
                <p className="mt-1 text-base text-gray-700">
                  {isAdmin
                    ? "Kelola akun, informasi pengguna, dan hak akses."
                    : "Lihat daftar akun dan informasi pengguna."}
                </p>
                <p className="mt-1 text-sm font-semibold text-blue-700">
                  Login sebagai: {formatRole(currentUserRole ?? "")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void fetchUsers()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw
                  size={19}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <UserPlus size={20} />
                  Tambah User
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && !showModal && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900">
              <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-700" />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto"
                aria-label="Tutup pesan error"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-base text-green-900">
              <CheckCircle2 size={22} className="text-green-700" />
              <span>{success}</span>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="ml-auto"
                aria-label="Tutup pesan sukses"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Statistik */}
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Total User
                  </p>
                  <p className="mt-2 text-3xl font-bold text-black">
                    {users.length}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                  <UserRound size={26} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    Administrator
                  </p>
                  <p className="mt-2 text-3xl font-bold text-black">
                    {users.filter((user) => user.role === "admin").length}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-100 p-3 text-purple-800">
                  <ShieldCheck size={26} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-gray-700">
                    User Lainnya
                  </p>
                  <p className="mt-2 text-3xl font-bold text-black">
                    {users.filter((user) => user.role !== "admin").length}
                  </p>
                </div>
                <div className="rounded-xl bg-green-100 p-3 text-green-800">
                  <UserPlus size={26} />
                </div>
              </div>
            </div>
          </div>

          {/* Daftar akun */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-black">
                  Daftar Akun
                </h2>
                <p className="mt-1 text-base text-gray-700">
                  {isAdmin
                    ? "Kelola akun menggunakan tombol aksi."
                    : "Mode baca saja. Kamu tidak dapat mengubah data akun."}
                </p>
              </div>

              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari ID, nama, email, atau role..."
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-base text-black outline-none placeholder:text-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-96"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-base">
                <thead className="bg-gray-100 text-sm uppercase tracking-wide text-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-bold">ID</th>
                    <th className="px-6 py-4 font-bold">Nama</th>
                    <th className="px-6 py-4 font-bold">Email</th>
                    <th className="px-6 py-4 font-bold">Password</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-center font-bold">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 6 : 5}
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex items-center justify-center gap-3 text-gray-700">
                          <LoaderCircle size={22} className="animate-spin" />
                          Memuat data user...
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 6 : 5}
                        className="px-6 py-16 text-center"
                      >
                        <UserRound
                          size={42}
                          className="mx-auto mb-3 text-gray-500"
                        />
                        <p className="text-lg font-semibold text-black">
                          Data user tidak ditemukan
                        </p>
                        <p className="mt-1 text-base text-gray-600">
                          Coba ubah kata kunci pencarian.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="transition hover:bg-gray-50">
                        <td className="px-6 py-5 font-semibold text-black">
                          {user.id}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-blue-800">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-black">
                              {user.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-black">{user.email}</td>

                        <td className="px-6 py-5 font-mono text-gray-600">
                          <span aria-label="Password tidak ditampilkan">
                            ••••••••
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold ${
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-900"
                                : user.role === "pimpinan"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {formatRole(user.role)}
                          </span>
                        </td>

                        {isAdmin && (
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(user)}
                                className="rounded-lg p-2.5 text-blue-700 transition hover:bg-blue-100"
                                title={`Edit akun ID ${user.id}`}
                                aria-label={`Edit akun ${user.name}`}
                              >
                                <Pencil size={20} />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(user)}
                                disabled={
                                  deletingId === user.id ||
                                  user.id === currentUserId
                                }
                                className="rounded-lg p-2.5 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  user.id === currentUserId
                                    ? "Akun yang sedang login tidak bisa dihapus"
                                    : "Hapus user"
                                }
                                aria-label={`Hapus akun ${user.name}`}
                              >
                                {deletingId === user.id ? (
                                  <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={20} />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && (
              <div className="border-t border-gray-200 px-6 py-5 text-base text-gray-700">
                Menampilkan {filteredUsers.length} dari {users.length} user
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Modal tambah / edit akun khusus Admin */}
      {isAdmin && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              handleCloseModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-7 py-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-800">
                  {editingUser ? (
                    <Pencil size={24} />
                  ) : (
                    <UserPlus size={24} />
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-black">
                    {editingUser
                      ? `Edit Akun ID ${editingUser.id}`
                      : "Tambah User"}
                  </h2>
                  <p className="mt-1 text-base text-gray-700">
                    {editingUser
                      ? "Ubah informasi akun yang dipilih."
                      : "Masukkan informasi akun pengguna baru."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                aria-label="Tutup modal"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-7">
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900">
                  <AlertCircle
                    size={21}
                    className="mt-0.5 shrink-0 text-red-700"
                  />
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="ml-auto"
                    aria-label="Tutup pesan error"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="account-name" className={labelClass}>
                  Nama Lengkap <span className="text-red-700">*</span>
                </label>
                <input
                  id="account-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Masukkan nama lengkap"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="account-email" className={labelClass}>
                  Email <span className="text-red-700">*</span>
                </label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="contoh@email.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="account-password" className={labelClass}>
                  {editingUser ? "Password Baru (Opsional)" : "Password"}
                  {!editingUser && (
                    <span className="text-red-700"> *</span>
                  )}
                </label>

                <div className="relative">
                  <input
                    id="account-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required={!editingUser}
                    minLength={8}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder={
                      editingUser
                        ? "Kosongkan jika tidak ingin mengganti password"
                        : "Password minimal 8 karakter"
                    }
                    className={`${inputClass} pr-14`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={21} />
                    ) : (
                      <Eye size={21} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  {editingUser
                    ? "Biarkan kosong untuk mempertahankan password saat ini."
                    : "Password minimal 8 karakter."}
                </p>
              </div>

              <div>
                <label htmlFor="account-role" className={labelClass}>
                  Role <span className="text-red-700">*</span>
                </label>
                <select
                  id="account-role"
                  required
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="admin">Admin</option>
                  <option value="gudang">Gudang</option>
                  <option value="pimpinan">Pimpinan</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-black transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={21} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingUser ? (
                    <>
                      <CheckCircle2 size={21} />
                      Simpan Perubahan
                    </>
                  ) : (
                    <>
                      <UserPlus size={21} />
                      Simpan User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
