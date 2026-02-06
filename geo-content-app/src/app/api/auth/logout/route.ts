import { NextRequest, NextResponse } from 'next/server';
import { buildSetCookie, parseCookies } from '@/lib/auth';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';
const ACCOUNT_COOKIE_PREFIX = 'geo_session_u_';

export async function POST(req: NextRequest) {
  let all = false;
  try {
    const body = (await req.json()) as { all?: unknown };
    all = body?.all === true;
  } catch {}
  const secure = new URL(req.url).protocol === 'https:';
  const res = NextResponse.json({ success: true });
  res.headers.append('Set-Cookie', buildSetCookie(COOKIE_NAME, '', { maxAgeSeconds: 0, secure }));
  if (all) {
    const cookies = parseCookies(req.headers.get('cookie'));
    for (const name of Object.keys(cookies)) {
      if (!name.startsWith(ACCOUNT_COOKIE_PREFIX)) continue;
      res.headers.append('Set-Cookie', buildSetCookie(name, '', { maxAgeSeconds: 0, secure }));
    }
  }
  return res;
}
