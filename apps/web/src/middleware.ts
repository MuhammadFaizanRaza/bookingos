import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'book', 'assets']);

/**
 * Resolves a tenant slug from the request subdomain (e.g. lumiere.salonos.app)
 * and forwards it to the app as the `x-tenant-slug` header so the API client
 * can scope requests. Falls back to none on localhost / reserved subdomains.
 */
function resolveTenantSlug(req: NextRequest): string | null {
  const host = req.headers.get('host')?.split(':')[0] ?? '';
  const parts = host.split('.');
  // host like <slug>.salonos.app -> at least 3 labels and not reserved
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && !RESERVED.has(sub)) return sub;
  }
  return null;
}

export default function middleware(req: NextRequest) {
  const response = intlMiddleware(req);
  const slug = resolveTenantSlug(req);
  if (slug) {
    response.headers.set('x-tenant-slug', slug);
  }
  return response;
}

export const config = {
  // Match all pathnames except for api, static files and Next internals.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
