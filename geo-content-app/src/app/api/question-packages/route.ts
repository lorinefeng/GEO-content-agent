import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());

  try {
    const result = await db
      .prepare(
        `SELECT
          qp.id, qp.article_id, qp.mode, qp.product_id, qp.product_name,
          qp.strategy, qp.strategy_name, qp.status, qp.error_message,
          qp.package_json, qp.created_at, qp.updated_at,
          a.created_at AS article_created_at
        FROM QuestionPackage qp
        LEFT JOIN Article a ON a.id = qp.article_id
        WHERE qp.mode = 'sku'
        ORDER BY qp.updated_at DESC, qp.created_at DESC
        LIMIT 500`
      )
      .all();

    return NextResponse.json({ packages: result.results ?? [] });
  } catch (error) {
    console.error('Fetch question packages error:', error);
    return NextResponse.json({ error: 'Failed to fetch question packages' }, { status: 500 });
  }
}

