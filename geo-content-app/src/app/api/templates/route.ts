import { NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function GET() {
  const db = getD1Database();

  try {
    const result = await db
      .prepare('SELECT strategy, name, prompt FROM Template ORDER BY strategy ASC')
      .all();
    const templates = result?.results ?? [];
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
