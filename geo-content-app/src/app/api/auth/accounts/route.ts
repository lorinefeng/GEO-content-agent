import { NextRequest, NextResponse } from 'next/server';
import { getCookieValue, parseCookies, verifySessionToken } from '@/lib/auth';
import { ensureAuthTables, ensureDefaultAdmin, findActiveUserById } from '@/lib/authDb';

export const runtime = 'edge';

const COOKIE_NAME = 'geo_session';
const ACCOUNT_COOKIE_PREFIX = 'geo_session_u_';

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);

  let db;
  try {
    db = await ensureAuthTables();
    await ensureDefaultAdmin(db);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `初始化数据库失败: ${msg}` }, { status: 500 });
  }

  const activeToken = getCookieValue(cookieHeader, COOKIE_NAME);
  const activePayload = activeToken ? await verifySessionToken(activeToken) : null;
  const activeUser = activePayload ? await findActiveUserById(db, activePayload.sub) : null;

  const accountMap = new Map<string, { id: string; username: string; role: 'admin' | 'user' }>();
  for (const [name, token] of Object.entries(cookies)) {
    if (!name.startsWith(ACCOUNT_COOKIE_PREFIX)) continue;
    if (!token) continue;
    const payload = await verifySessionToken(token);
    if (!payload) continue;
    if (accountMap.has(payload.sub)) continue;
    const user = await findActiveUserById(db, payload.sub);
    if (!user) continue;
    accountMap.set(user.id, { id: user.id, username: user.username, role: user.role });
  }

  const accounts = Array.from(accountMap.values()).sort((a, b) => {
    if (activeUser?.id && a.id === activeUser.id) return -1;
    if (activeUser?.id && b.id === activeUser.id) return 1;
    return a.username.localeCompare(b.username, 'zh-CN');
  });

  return NextResponse.json({
    activeUser: activeUser ? { id: activeUser.id, username: activeUser.username, role: activeUser.role } : null,
    accounts,
  });
}

