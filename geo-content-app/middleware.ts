import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

const COOKIE_NAME = 'geo_session';

const PUBLIC_PATHS = ['/login', '/api/health', '/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/me'];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.startsWith('/public')) return true;
  return false;
}

function isProtectedPage(pathname: string) {
  return (
    pathname === '/generate' ||
    pathname === '/history' ||
    pathname === '/templates' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

function isProtectedApi(pathname: string) {
  return pathname.startsWith('/api/') && !PUBLIC_PATHS.includes(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const needsAuth = isProtectedPage(pathname) || isProtectedApi(pathname);
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value ?? '';
  const payload = token ? await verifySessionToken(token) : null;

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
    if (payload.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/generate', '/history', '/templates', '/admin/:path*', '/api/:path*'],
};

