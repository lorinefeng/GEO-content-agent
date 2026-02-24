import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode => {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
};

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ strategy: string }> }
) {
  const actor = await getActiveUser(req);
  if (!actor) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { strategy } = await ctx.params;

  if (!strategy) {
    return NextResponse.json({ error: '缺少 strategy' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mode = parseMode(searchParams.get('mode'));
    const body = (await req.json()) as { prompt?: unknown; name?: unknown };
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const name = typeof body.name === 'string' ? body.name : undefined;

    if (!prompt) {
      return NextResponse.json({ error: 'prompt 不能为空' }, { status: 400 });
    }

    const existing = await db
      .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
      .bind(mode, strategy)
      .first();

    if (existing && typeof (existing as { prompt?: unknown }).prompt === 'string') {
      const prev = existing as { name?: unknown; prompt?: unknown };
      const revisionId = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO TemplateRevision (id, mode, strategy, name, prompt, changed_at, changed_by) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)"
        )
        .bind(
          revisionId,
          mode,
          strategy,
          typeof prev.name === 'string' ? prev.name : strategy,
          typeof prev.prompt === 'string' ? prev.prompt : '',
          actor?.id ?? null
        )
        .run();
    }

    const templateName = name || strategy;

    await db
      .prepare(
        'INSERT INTO Template (mode, strategy, name, prompt) VALUES (?, ?, ?, ?) ON CONFLICT(mode, strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt'
      )
      .bind(mode, strategy, templateName, prompt)
      .run();

    const template = await db
      .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
      .bind(mode, strategy)
      .first();

    return NextResponse.json({ success: true, mode, template });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
