import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { strategy } = await ctx.params;
  if (!strategy) return NextResponse.json({ error: '缺少 strategy' }, { status: 400 });

  const result = await db
    .prepare(
      'SELECT id, strategy, name, prompt, changed_at, changed_by FROM TemplateRevision WHERE strategy = ? ORDER BY changed_at DESC LIMIT 50'
    )
    .bind(strategy)
    .all();

  return NextResponse.json({ revisions: result?.results ?? [] });
}
