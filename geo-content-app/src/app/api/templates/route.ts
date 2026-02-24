import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode => {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
};

export async function GET(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();
  const db = await ensureDatabaseReady(getD1Database());

  try {
    const { searchParams } = new URL(req.url);
    const mode = parseMode(searchParams.get('mode'));

    const result = await db
      .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? ORDER BY strategy ASC')
      .bind(mode)
      .all();
    const templates = result?.results ?? [];
    return NextResponse.json({ mode, templates });
  } catch (error) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
