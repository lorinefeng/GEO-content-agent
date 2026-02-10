import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

type ExportedArticle = {
  article_id: string;
  strategy: string;
  strategy_name: string;
  content: string;
  published_url?: string;
  created_at: string;
};

type ExportedProductRecord = {
  product: Record<string, unknown>;
  articles: ExportedArticle[];
  db_ref: { table: 'Article'; product_id: string; article_ids: string[] };
  exported_at: string;
};

const buildJsonDownloadResponse = (filename: string, payload: unknown) => {
  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
};

export async function GET(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const product_id = searchParams.get('product_id') || '';
  if (!product_id) {
    return NextResponse.json({ error: '缺少 product_id' }, { status: 400 });
  }

  const db = await ensureDatabaseReady(getD1Database());

  try {
    const result = await db
      .prepare(
        `SELECT id, product_name, product_price, product_id, strategy, strategy_name, content, published_url, product_payload, created_at
         FROM Article
         WHERE product_id = ?
         ORDER BY created_at DESC`
      )
      .bind(product_id)
      .all();

    const rows = (result.results ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      return NextResponse.json({ error: '未找到对应 product_id 的记录' }, { status: 404 });
    }

    let product: Record<string, unknown> | null = null;
    for (const r of rows) {
      const payload = typeof r.product_payload === 'string' ? r.product_payload : '';
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed === 'object') {
          product = parsed as Record<string, unknown>;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!product) {
      const first = rows[0] ?? {};
      product = {
        name: typeof first.product_name === 'string' ? first.product_name : '',
        price: typeof first.product_price === 'number' ? first.product_price : null,
      };
    }

    const articles: ExportedArticle[] = rows.map((r) => ({
      article_id: typeof r.id === 'string' ? r.id : '',
      strategy: typeof r.strategy === 'string' ? r.strategy : '',
      strategy_name: typeof r.strategy_name === 'string' ? r.strategy_name : '',
      content: typeof r.content === 'string' ? r.content : '',
      published_url: typeof r.published_url === 'string' && r.published_url ? r.published_url : undefined,
      created_at: typeof r.created_at === 'string' ? r.created_at : '',
    }));

    const record: ExportedProductRecord = {
      product,
      articles,
      db_ref: { table: 'Article', product_id, article_ids: articles.map((a) => a.article_id).filter(Boolean) },
      exported_at: new Date().toISOString(),
    };

    return buildJsonDownloadResponse(`product-${product_id}.json`, record);
  } catch (error) {
    console.error('Export product error:', error);
    return NextResponse.json({ error: 'Failed to export product' }, { status: 500 });
  }
}

