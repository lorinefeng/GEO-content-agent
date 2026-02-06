import { NextRequest, NextResponse } from 'next/server';
import { unauthorized, getActiveUser } from '@/lib/apiAuth';
import { ensureAuthTables, ensureDefaultAdmin, createActiveUser, type UserRole } from '@/lib/authDb';

export const runtime = 'edge';

function generatePassword(len = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function POST(req: NextRequest) {
  const actor = await getActiveUser(req);
  if (!actor) return unauthorized();
  if (actor.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const body = (await req.json()) as { username?: unknown; password?: unknown; role?: unknown };
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const suppliedPassword = typeof body.password === 'string' ? body.password : '';
  const role: UserRole = body.role === 'admin' ? 'admin' : 'user';
  const password = suppliedPassword || generatePassword(12);
  const generated = !suppliedPassword;

  let db;
  try {
    db = await ensureAuthTables();
    await ensureDefaultAdmin(db);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `初始化数据库失败: ${msg}` }, { status: 500 });
  }

  const created = await createActiveUser(db, { username, password, role });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });

  return NextResponse.json({
    success: true,
    user: { id: created.user.id, username: created.user.username, role: created.user.role },
    ...(generated ? { password } : {}),
  });
}

