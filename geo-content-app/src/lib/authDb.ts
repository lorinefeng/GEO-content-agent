import { getD1Database } from '@/lib/cloudflare';
import { hashPassword, verifyPassword } from '@/lib/auth';
import type { D1Database } from '@cloudflare/workers-types';
import { ensureDatabaseReady } from '@/lib/dbInit';

export type UserRole = 'admin' | 'user';

export type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  status: 'active';
  created_at: string;
};

export type RegistrationRequestRow = {
  id: string;
  username: string;
  password_hash: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

const DEFAULT_ADMIN_USERNAME = 'karpsie';
const DEFAULT_ADMIN_PASSWORD = 'Feng3384832740';

export async function ensureAuthTables() {
  const db = getD1Database();
  return ensureDatabaseReady(db);
}

export async function ensureDefaultAdmin(db: D1Database) {
  const existing = (await db
    .prepare('SELECT id, username, password_hash, role, status, created_at FROM User WHERE role = ? LIMIT 1')
    .bind('admin')
    .first()) as UserRow | null;

  if (existing) return existing;

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  await db
    .prepare(
      "INSERT INTO User (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, 'active', datetime('now'))"
    )
    .bind(id, DEFAULT_ADMIN_USERNAME, password_hash, 'admin')
    .run();

  const created = (await db
    .prepare('SELECT id, username, password_hash, role, status, created_at FROM User WHERE id = ?')
    .bind(id)
    .first()) as UserRow | null;
  if (!created) throw new Error('创建管理员失败');
  return created;
}

export async function findActiveUserByUsername(db: D1Database, username: string) {
  const row = (await db
    .prepare('SELECT id, username, password_hash, role, status, created_at FROM User WHERE username = ? AND status = ?')
    .bind(username, 'active')
    .first()) as UserRow | null;
  return row ?? null;
}

export async function findActiveUserById(db: D1Database, id: string) {
  const row = (await db
    .prepare('SELECT id, username, password_hash, role, status, created_at FROM User WHERE id = ? AND status = ?')
    .bind(id, 'active')
    .first()) as UserRow | null;
  return row ?? null;
}

export async function verifyUserPassword(db: D1Database, username: string, password: string) {
  const user = await findActiveUserByUsername(db, username);
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  return ok ? user : null;
}

export async function createRegistrationRequest(db: D1Database, username: string, password: string) {
  const existingUser = (await db
    .prepare('SELECT id FROM User WHERE username = ? LIMIT 1')
    .bind(username)
    .first()) as { id?: unknown } | null;
  if (existingUser?.id) {
    return { ok: false, error: '用户名已存在' as const };
  }

  const existingReq = (await db
    .prepare('SELECT id, status FROM RegistrationRequest WHERE username = ? LIMIT 1')
    .bind(username)
    .first()) as { id?: unknown; status?: unknown } | null;

  if (existingReq?.id && existingReq?.status === 'pending') {
    return { ok: false, error: '该用户名已有待审批申请' as const };
  }

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await db
    .prepare(
      "INSERT OR REPLACE INTO RegistrationRequest (id, username, password_hash, status, requested_at, decided_at, decided_by) VALUES (?, ?, ?, 'pending', datetime('now'), NULL, NULL)"
    )
    .bind(id, username, password_hash)
    .run();
  return { ok: true, id } as const;
}

export async function listPendingRegistrationRequests(db: D1Database) {
  const result = await db
    .prepare(
      'SELECT id, username, password_hash, status, requested_at, decided_at, decided_by FROM RegistrationRequest WHERE status = ? ORDER BY requested_at DESC'
    )
    .bind('pending')
    .all();
  return (result?.results ?? []) as RegistrationRequestRow[];
}

export async function getRegistrationRequestById(db: D1Database, id: string) {
  const row = (await db
    .prepare(
      'SELECT id, username, password_hash, status, requested_at, decided_at, decided_by FROM RegistrationRequest WHERE id = ?'
    )
    .bind(id)
    .first()) as RegistrationRequestRow | null;
  return row ?? null;
}

export async function approveRegistrationRequest(db: D1Database, id: string, decidedBy: string) {
  const req = await getRegistrationRequestById(db, id);
  if (!req || req.status !== 'pending') return { ok: false, error: '申请不存在或已处理' as const };

  const existingUser = (await db
    .prepare('SELECT id FROM User WHERE username = ? LIMIT 1')
    .bind(req.username)
    .first()) as { id?: unknown } | null;
  if (existingUser?.id) {
    await db
      .prepare("UPDATE RegistrationRequest SET status='approved', decided_at=datetime('now'), decided_by=? WHERE id=?")
      .bind(decidedBy, id)
      .run();
    return { ok: true } as const;
  }

  const userId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO User (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, 'user', 'active', datetime('now'))"
    )
    .bind(userId, req.username, req.password_hash)
    .run();

  await db
    .prepare("UPDATE RegistrationRequest SET status='approved', decided_at=datetime('now'), decided_by=? WHERE id=?")
    .bind(decidedBy, id)
    .run();

  return { ok: true } as const;
}

export async function rejectRegistrationRequest(db: D1Database, id: string, decidedBy: string) {
  const req = await getRegistrationRequestById(db, id);
  if (!req || req.status !== 'pending') return { ok: false, error: '申请不存在或已处理' as const };

  await db
    .prepare("UPDATE RegistrationRequest SET status='rejected', decided_at=datetime('now'), decided_by=? WHERE id=?")
    .bind(decidedBy, id)
    .run();

  return { ok: true } as const;
}
