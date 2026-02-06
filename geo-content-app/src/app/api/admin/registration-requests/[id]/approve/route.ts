import { NextRequest, NextResponse } from 'next/server';
import { getCookieValue, verifySessionToken } from '@/lib/auth';
import { approveRegistrationRequest, ensureAuthTables, ensureDefaultAdmin, findActiveUserById } from '@/lib/authDb';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = getCookieValue(req.headers.get('cookie'), COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const db = await ensureAuthTables();
  await ensureDefaultAdmin(db);
  const admin = await findActiveUserById(db, payload.sub);
  if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

  const result = await approveRegistrationRequest(db, id, admin.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}

