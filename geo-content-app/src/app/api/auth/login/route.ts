import { NextRequest, NextResponse } from 'next/server';
import { buildSetCookie, signSessionToken } from '@/lib/auth';
import {
  ensureAuthTables,
  ensureDefaultAdmin,
  getBootstrapAdminConfig,
  upsertActiveAdminUser,
  verifyUserPassword,
} from '@/lib/authDb';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';

export async function POST(req: NextRequest) {
  let db;
  try {
    db = await ensureAuthTables();
    await ensureDefaultAdmin(db);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `初始化数据库失败: ${msg}` }, { status: 500 });
  }

  const body = (await req.json()) as { username?: unknown; password?: unknown };
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: '用户名或密码不能为空' }, { status: 400 });
  }

  let user;
  try {
    user = await verifyUserPassword(db, username, password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `密码校验异常: ${msg}` }, { status: 500 });
  }
  const bootstrap = getBootstrapAdminConfig();
  if (
    (!user || bootstrap.forceReset) &&
    username === bootstrap.username &&
    password === bootstrap.password &&
    bootstrap.username &&
    bootstrap.password
  ) {
    try {
      user = await upsertActiveAdminUser(db, bootstrap.username, bootstrap.password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `管理员自愈失败: ${msg}` }, { status: 500 });
    }
  }
  if (!user) {
    return NextResponse.json({ error: '用户名或密码错误，或账号未获批准' }, { status: 401 });
  }

  const token = await signSessionToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });

  const secure = new URL(req.url).protocol === 'https:';
  const res = NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role },
  });
  res.headers.append('Set-Cookie', buildSetCookie(COOKIE_NAME, token, { maxAgeSeconds: 60 * 60 * 24 * 7, secure }));
  return res;
}
