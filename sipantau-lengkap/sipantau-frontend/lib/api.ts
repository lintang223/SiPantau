/**
 * lib/api.ts
 * Helper untuk semua fetch ke backend SiPantau.
 * Otomatis menambahkan JWT token dan menangani error 401.
 */

// Gunakan localhost di client agar domain cookie cocok dengan Next.js (localhost:3000)
// Di server/Node.js, gunakan 127.0.0.1 karena Node 18+ sering bermasalah dengan localhost IPv6 (::1)
const isServer = typeof window === "undefined";
export const API_URL = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace("127.0.0.1", "localhost");
export const AGENT_URL = isServer
  ? (process.env.NEXT_PUBLIC_AGENT_URL || "http://127.0.0.1:7777").replace("localhost", "127.0.0.1")
  : (process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:7777").replace("127.0.0.1", "localhost");

/**
 * @deprecated Token sekarang dikelola murni via HttpOnly Cookie dari backend.
 * Fungsi ini dipertahankan hanya untuk kompatibilitas, tapi tidak digunakan untuk auth.
 */
export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("sipantau_token") || "";
}

/**
 * @deprecated Tidak perlu menyimpan token di localStorage lagi.
 * Auth dikelola murni via HttpOnly Cookie.
 */
export function saveToken(token: string) {
  // No-op: token tidak lagi disimpan di localStorage (risiko XSS)
  void token;
}

/** Hapus semua auth data dan redirect ke login */
export function logout() {
  // Panggil backend untuk menghapus HttpOnly cookie secara asinkron
  fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  }).catch(e => console.error("Gagal logout backend:", e));

  // Bersihkan data sesi dari localStorage
  localStorage.removeItem("sipantau_auth");
  localStorage.removeItem("sipantau_user");
  // sipantau_token di localStorage sudah tidak dipakai, tapi hapus juga untuk kebersihan
  localStorage.removeItem("sipantau_token");

  // Hapus cookie dummy middleware
  if (typeof document !== "undefined") {
    document.cookie = "sipantau_auth=; path=/; max-age=0";
  }
  if (typeof window !== "undefined") window.location.href = "/";
}

/**
 * Wrapper fetch yang otomatis mengirim credentials (HttpOnly Cookie).
 * Auth TIDAK lagi menggunakan Authorization: Bearer header —
 * token dikelola murni via HttpOnly Cookie sehingga tidak bisa diakses JS (anti-XSS).
 * Jika response 401, clear session dan redirect ke login.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // Wajib agar HttpOnly Cookie selalu dikirim ke backend
  });

  if (res.status === 401) {
    logout();
    throw new Error("Sesi habis. Silakan login ulang.");
  }

  return res;
}
