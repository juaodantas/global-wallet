import { NextResponse, type NextRequest } from 'next/server';

const sessionCookieName = 'gw_session';
const publicPagePaths = new Set(['/login', '/register']);
const staticAssetPattern = /\.[^/]+$/;

function isExcludedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname === '/api' ||
    pathname.startsWith('/_next/') ||
    staticAssetPattern.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isExcludedPath(pathname) || publicPagePaths.has(pathname)) {
    return NextResponse.next();
  }

  if (request.cookies.has(sessionCookieName)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/|.*\\.[^/]+$).*)']
};
