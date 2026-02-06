import { NextRequest, NextResponse } from 'next/server';
import { ensureAuthTables, ensureDefaultAdmin, createRegistrationRequest } from '@/lib/authDb';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const db = await ensureAuthTables();
  await ensureDefaultAdmin(db);

  const body = (await req.json()) as { username?: unknown; password?: unknown };
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json({ error: '用户名或密码不能为空' }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json({ error: '用户名至少 3 个字符' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 });
  }

  const result = await createRegistrationRequest(db, username, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, request_id: result.id });
}

