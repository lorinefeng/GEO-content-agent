import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode => {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  const actor = await getActiveUser(req);
  if (!actor) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { strategy } = await ctx.params;
  if (!strategy) return NextResponse.json({ error: '缺少 strategy' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get('mode'));

  const body = (await req.json()) as { revision_id?: unknown };
  const revision_id = typeof body.revision_id === 'string' ? body.revision_id : '';
  if (!revision_id) return NextResponse.json({ error: '缺少 revision_id' }, { status: 400 });

  const revision = await db
    .prepare('SELECT id, mode, strategy, name, prompt FROM TemplateRevision WHERE id = ? AND mode = ? AND strategy = ?')
    .bind(revision_id, mode, strategy)
    .first();
  if (!revision) return NextResponse.json({ error: '变更记录不存在' }, { status: 404 });

  const current = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
    .bind(mode, strategy)
    .first();

  if (current && typeof (current as { prompt?: unknown }).prompt === 'string') {
    const prev = current as { name?: unknown; prompt?: unknown };
    const snapshotId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO TemplateRevision (id, mode, strategy, name, prompt, changed_at, changed_by) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)"
      )
      .bind(
        snapshotId,
        mode,
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
      'INSERT INTO Template (mode, strategy, name, prompt) VALUES (?, ?, ?, ?) ON CONFLICT(mode, strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt'
    )
    .bind(mode, strategy, typeof rev.name === 'string' ? rev.name : strategy, typeof rev.prompt === 'string' ? rev.prompt : '')
    .run();

  const template = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
    .bind(mode, strategy)
    .first();

  return NextResponse.json({ success: true, mode, template });
}
