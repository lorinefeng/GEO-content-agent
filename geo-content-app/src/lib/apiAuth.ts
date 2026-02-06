import { NextRequest, NextResponse } from 'next/server';
import { getCookieValue, verifySessionToken } from '@/lib/auth';
import { ensureAuthTables, ensureDefaultAdmin, findActiveUserById } from '@/lib/authDb';

const COOKIE_NAME = 'geo_session';

export function unauthorized() {
  return NextResponse.json({ error: '未登录' }, { status: 401 });
}

export async function getActiveUser(req: NextRequest) {
  const token = getCookieValue(req.headers.get('cookie'), COOKIE_NAME);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const db = await ensureAuthTables();
  await ensureDefaultAdmin(db);
  const user = await findActiveUserById(db, payload.sub);
  if (!user) return null;
  return user;
}

