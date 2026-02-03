import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function PUT(
  req: NextRequest,
  { params }: { params: { strategy: string } }
) {
  const db = getD1Database();
  const { strategy } = params;

  try {
    const body = (await req.json()) as { prompt?: unknown; name?: unknown };
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const name = typeof body.name === 'string' ? body.name : undefined;

    if (!prompt) {
      return NextResponse.json({ error: 'prompt 不能为空' }, { status: 400 });
    }

    const templateName = name || strategy;

    await db
      .prepare(
        'INSERT INTO Template (strategy, name, prompt) VALUES (?, ?, ?) ON CONFLICT(strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt'
      )
      .bind(strategy, templateName, prompt)
      .run();

    const template = await db
      .prepare('SELECT strategy, name, prompt FROM Template WHERE strategy = ?')
      .bind(strategy)
      .first();

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
