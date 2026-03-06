import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

const buildJsonDownloadResponse = (filename: string, payload: string) =>
  new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });

const safeFileName = (value: string) => value.replace(/[^\w\u4e00-\u9fa5\-]+/g, '-').slice(0, 60) || 'question-package';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  const db = await ensureDatabaseReady(getD1Database());

  try {
    const row = (await db
      .prepare(`SELECT product_name, strategy, package_json FROM QuestionPackage WHERE id = ?`)
      .bind(id)
      .first()) as Record<string, unknown> | null;

    if (!row) {
      return NextResponse.json({ error: '问题包不存在' }, { status: 404 });
    }

    const productName = typeof row.product_name === 'string' ? row.product_name : 'question-package';
    const strategy = typeof row.strategy === 'string' ? row.strategy : 'sku';
    const packageJson = typeof row.package_json === 'string' ? row.package_json : '{}';

    return buildJsonDownloadResponse(`${safeFileName(productName)}-${safeFileName(strategy)}.json`, packageJson);
  } catch (error) {
    console.error('Export question package error:', error);
    return NextResponse.json({ error: 'Failed to export question package' }, { status: 500 });
  }
}

