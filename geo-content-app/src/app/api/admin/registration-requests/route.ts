import { NextRequest, NextResponse } from 'next/server';
import { getCookieValue, verifySessionToken } from '@/lib/auth';
import { ensureAuthTables, ensureDefaultAdmin, findActiveUserById, listPendingRegistrationRequests } from '@/lib/authDb';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';

export async function GET(req: NextRequest) {
  const token = getCookieValue(req.headers.get('cookie'), COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const db = await ensureAuthTables();
  await ensureDefaultAdmin(db);

  const user = await findActiveUserById(db, payload.sub);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const requests = await listPendingRegistrationRequests(db);
  return NextResponse.json({
    requests: requests.map((r) => ({ id: r.id, username: r.username, requested_at: r.requested_at })),
  });
}

