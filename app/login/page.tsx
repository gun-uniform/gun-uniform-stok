"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Package,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  UserRound,
  UserPlus,
  LogIn,
} from "lucide-react";
import api from "@/lib/api";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        email: email.trim(),
        password,
      });

      const userData =
        response.data?.user ??
        response.data?.data?.user;

      const token =
        response.data?.token ??
        response.data?.access_token;

      if (!userData || !token) {
        setError(
          "Respons login belum berisi data akun atau token. Periksa respons API Laravel."
        );
        return;
      }

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);

      router.replace("/dashboard");

    } catch (err: unknown) {
      console.error("Login gagal:", err);

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data as {
            message?: string;
            errors?: Record<string, string[]>;
          };

          console.error("Status HTTP:", status);
          console.error("Respons API:", data);

          const validationMessage = Object.values(
            data?.errors ?? {}
          )[0]?.[0];

          if (status === 401 || status === 422) { } else if (err.request) {
            setError(
              validationMessage ||
              data?.message ||
              "Email atau password tidak sesuai."
            );
          } else {
            setError(
              `Login gagal (HTTP ${status}). Silakan coba kembali.`
            );
          }

        } else if (err.request) {
          console.error("Kode error jaringan:", err.code);
          console.error("URL API:", err.config?.url);
          console.error("Base URL API:", err.config?.baseURL);

          if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
            setError(
              "Koneksi ke server terlalu lama. Periksa jaringan dan coba kembali."
            );
          } else {
            setError(
              "Browser tidak dapat membaca respons API. Kemungkinan ada masalah koneksi, CORS, DNS, atau HTTPS. Periksa Console dan Network untuk mengetahui penyebabnya."
            );
          }
        }
        else {
          setError(err.message || "Terjadi kesalahan saat login.");
        }
      } else {
        setError("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      });

      setIsRegister(false);
      setName("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setSuccess(
        "Registrasi berhasil! Silakan login menggunakan akun yang baru dibuat."
      );
    } catch (err: unknown) {
      console.error("Registrasi gagal:", err);

      const axiosError = err as {
        response?: {
          data?: {
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
      };

      const validationMessage = Object.values(
        axiosError.response?.data?.errors ?? {}
      )[0]?.[0];

      setError(
        validationMessage ||
        axiosError.response?.data?.message ||
        "Registrasi gagal. Pastikan server Laravel berjalan dan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <main className="flex min-h-screen bg-white text-black">
      {/* Panel kiri */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex xl:p-16">
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
            <Package size={27} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-wide">
              REKAP BARANG
            </h1>
            <p className="text-sm text-slate-300">
              Inventory Management System
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200">
            <ShieldCheck size={17} />
            Sistem Pengelolaan Inventaris
          </div>

          <h2 className="text-4xl font-bold leading-tight xl:text-5xl">
            Kelola Stok Barang
            <span className="mt-2 block text-blue-300">
              Lebih Mudah dan Terorganisir.
            </span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Pantau barang masuk dan keluar, periksa ketersediaan stok,
            serta kelola data inventaris dalam satu sistem yang
            terintegrasi.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <Package size={23} className="mb-3 text-blue-300" />
              <p className="font-semibold">Data Terpusat</p>
              <p className="mt-1 text-sm text-slate-300">
                Informasi barang lebih terorganisir.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <ShieldCheck size={23} className="mb-3 text-blue-300" />
              <p className="font-semibold">Akses Terkelola</p>
              <p className="mt-1 text-sm text-slate-300">
                Mendukung pengelolaan akun pengguna.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-400">
          © {new Date().getFullYear()} Rekap Data Barang
        </p>
      </section>

      {/* Panel kanan */}
      <section className="flex min-h-screen w-full items-center justify-center px-6 py-10 sm:px-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white lg:hidden">
            <Package size={30} />
          </div>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              {isRegister ? "Registrasi Akun" : "Selamat Datang"}
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
              {isRegister ? "Buat Akun Baru" : "Masuk ke Akun"}
            </h2>

            <p className="mt-3 text-base leading-6 text-slate-600">
              {isRegister
                ? "Lengkapi data berikut untuk membuat akun pengelolaan barang."
                : "Masukkan email dan password untuk mengakses dashboard pengelolaan barang."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <form
            onSubmit={isRegister ? handleRegister : handleLogin}
            className="space-y-5"
          >
            {/* Nama lengkap khusus registrasi */}
            {isRegister && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-black"
                >
                  Nama Lengkap
                </label>

                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Masukkan nama lengkap"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={loading}
                    className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base text-black outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-black"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base text-black outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-black"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  placeholder={
                    isRegister
                      ? "Minimal 8 karakter"
                      : "Masukkan password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={isRegister ? 8 : undefined}
                  required
                  disabled={loading}
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-base text-black outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-black"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Konfirmasi password khusus registrasi */}
            {isRegister && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-black"
                >
                  Konfirmasi Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    minLength={8}
                    required
                    disabled={loading}
                    className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-base text-black outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan konfirmasi password"
                        : "Tampilkan konfirmasi password"
                    }
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-black"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tombol utama */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-base font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : isRegister ? (
                <>
                  <UserPlus size={20} />
                  Daftar Akun
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Masuk ke Dashboard
                </>
              )}
            </button>

            {/* Beralih mode */}
            <p className="text-center text-sm text-slate-600">
              {isRegister
                ? "Sudah punya akun?"
                : "Belum punya akun?"}{" "}
              <button
                type="button"
                disabled={loading}
                onClick={switchMode}
                className="font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-50"
              >
                {isRegister ? "Masuk di sini" : "Daftar di sini"}
              </button>
            </p>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

              <p className="text-sm leading-6 text-slate-600">
                Gunakan akun yang terdaftar pada sistem. Jangan
                bagikan password kepada orang lain.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Rekap Data Barang. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}