import { NextRequest, NextResponse } from 'next/server';
import { buildSetCookie } from '@/lib/auth';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';

export async function POST(req: NextRequest) {
  const secure = new URL(req.url).protocol === 'https:';
  const res = NextResponse.json({ success: true });
  res.headers.append('Set-Cookie', buildSetCookie(COOKIE_NAME, '', { maxAgeSeconds: 0, secure }));
  return res;
}

