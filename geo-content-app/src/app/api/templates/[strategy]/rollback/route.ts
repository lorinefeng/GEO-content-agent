import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

export async function POST(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  const actor = await getActiveUser(req);
  if (!actor) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { strategy } = await ctx.params;
  if (!strategy) return NextResponse.json({ error: '缺少 strategy' }, { status: 400 });

  const body = (await req.json()) as { revision_id?: unknown };
  const revision_id = typeof body.revision_id === 'string' ? body.revision_id : '';
  if (!revision_id) return NextResponse.json({ error: '缺少 revision_id' }, { status: 400 });

  const revision = await db
    .prepare('SELECT id, strategy, name, prompt FROM TemplateRevision WHERE id = ? AND strategy = ?')
    .bind(revision_id, strategy)
    .first();
  if (!revision) return NextResponse.json({ error: '变更记录不存在' }, { status: 404 });

  const current = await db.prepare('SELECT strategy, name, prompt FROM Template WHERE strategy = ?').bind(strategy).first();
  if (current && typeof (current as { prompt?: unknown }).prompt === 'string') {
    const prev = current as { name?: unknown; prompt?: unknown };
    const snapshotId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO TemplateRevision (id, strategy, name, prompt, changed_at, changed_by) VALUES (?, ?, ?, ?, datetime('now'), ?)"
      )
      .bind(
        snapshotId,
        strategy,
        typeof prev.name === 'string' ? prev.name : strategy,
        typeof prev.prompt === 'string' ? prev.prompt : '',
        actor?.id ?? null
      )
      .run();
  }

  const rev = revision as { name?: unknown; prompt?: unknown };
  await db
    .prepare(
      'INSERT INTO Template (strategy, name, prompt) VALUES (?, ?, ?) ON CONFLICT(strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt'
    )
    .bind(strategy, typeof rev.name === 'string' ? rev.name : strategy, typeof rev.prompt === 'string' ? rev.prompt : '')
    .run();

  const template = await db.prepare('SELECT strategy, name, prompt FROM Template WHERE strategy = ?').bind(strategy).first();
  return NextResponse.json({ success: true, template });
}
