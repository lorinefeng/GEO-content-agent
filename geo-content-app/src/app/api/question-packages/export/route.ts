import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

const buildJsonDownloadResponse = (filename: string, payload: unknown) =>
  new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });

export async function POST(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());

  try {
    const body = (await req.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((item): item is string => typeof item === 'string') : [];
    const unique = Array.from(new Set(ids.map((item) => item.trim()).filter(Boolean)));

    if (unique.length === 0) {
      return NextResponse.json({ error: '缺少 ids' }, { status: 400 });
    }
    if (unique.length > 200) {
      return NextResponse.json({ error: '批量导出数量过多（最多 200）' }, { status: 400 });
    }

    const items: unknown[] = [];
    for (const id of unique) {
      const row = (await db
        .prepare(`SELECT package_json FROM QuestionPackage WHERE id = ?`)
        .bind(id)
        .first()) as Record<string, unknown> | null;
      if (!row || typeof row.package_json !== 'string') continue;
      try {
        items.push(JSON.parse(row.package_json));
      } catch {
        continue;
      }
    }

    return buildJsonDownloadResponse(`question-packages-${unique.length}.json`, items);
  } catch (error) {
    console.error('Batch export question packages error:', error);
    return NextResponse.json({ error: 'Failed to export question packages' }, { status: 500 });
  }
}

