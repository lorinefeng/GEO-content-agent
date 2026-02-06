import { NextRequest, NextResponse } from 'next/server';
import { getCookieValue, verifySessionToken } from '@/lib/auth';
import { ensureAuthTables, ensureDefaultAdmin, findActiveUserById } from '@/lib/authDb';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';

export async function GET(req: NextRequest) {
  const token = getCookieValue(req.headers.get('cookie'), COOKIE_NAME);
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  const db = await ensureAuthTables();
  await ensureDefaultAdmin(db);
  const user = await findActiveUserById(db, payload.sub);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
}

