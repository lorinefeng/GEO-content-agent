import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode => {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { strategy } = await ctx.params;
  if (!strategy) return NextResponse.json({ error: '缺少 strategy' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get('mode'));

  const result = await db
    .prepare(
      'SELECT id, mode, strategy, name, prompt, changed_at, changed_by FROM TemplateRevision WHERE mode = ? AND strategy = ? ORDER BY changed_at DESC LIMIT 50'
    )
    .bind(mode, strategy)
    .all();

  return NextResponse.json({ mode, revisions: result?.results ?? [] });
}
