import { NextRequest, NextResponse } from 'next/server';
import { buildSetCookie, parseCookies, verifySessionToken } from '@/lib/auth';
import { ensureAuthTables, ensureDefaultAdmin, findActiveUserById } from '@/lib/authDb';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';
const ACCOUNT_COOKIE_PREFIX = 'geo_session_u_';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { userId?: unknown };
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId) return NextResponse.json({ error: 'userId 不能为空' }, { status: 400 });

  const cookies = parseCookies(req.headers.get('cookie'));
  const token = cookies[`${ACCOUNT_COOKIE_PREFIX}${userId}`];
  if (!token) return NextResponse.json({ error: '该账号未在本浏览器登录过' }, { status: 404 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: '该账号会话已失效，请重新登录' }, { status: 401 });

  let db;
  try {
    db = await ensureAuthTables();
    await ensureDefaultAdmin(db);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `初始化数据库失败: ${msg}` }, { status: 500 });
  }

  const user = await findActiveUserById(db, payload.sub);
  if (!user) return NextResponse.json({ error: '该账号不存在或未激活' }, { status: 404 });
  if (user.id !== userId) return NextResponse.json({ error: '账号标识不匹配' }, { status: 400 });

  const secure = new URL(req.url).protocol === 'https:';
  const maxAgeSeconds = 60 * 60 * 24 * 7;
  const res = NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  res.headers.append('Set-Cookie', buildSetCookie(COOKIE_NAME, token, { maxAgeSeconds, secure }));
  return res;
}

