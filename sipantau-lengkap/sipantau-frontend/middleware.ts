import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route yang memerlukan login
const PROTECTED_PATHS = [
  '/dashboard',
  '/scraping',
  '/riwayat',
  '/profil',
  '/pengaturan',
  '/kelola-user',
  '/riwayat-aktivitas',
  '/riwayat-login',
  '/riwayat-system',
  '/hasil',
  '/akses-ditolak',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cek apakah path ini butuh proteksi
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Cek cookie HttpOnly sipantau_token yang di-set oleh backend
  // Ini jauh lebih aman karena cookie HttpOnly tidak bisa dipalsukan via console JS
  const tokenCookie = request.cookies.get('sipantau_token')
  if (!tokenCookie?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/scraping/:path*',
    '/riwayat/:path*',
    '/profil/:path*',
    '/pengaturan/:path*',
    '/kelola-user/:path*',
    '/riwayat-aktivitas/:path*',
    '/riwayat-login/:path*',
    '/riwayat-system/:path*',
    '/hasil/:path*',
  ],
}
