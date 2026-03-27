import type { D1Database } from '@cloudflare/workers-types';
import { ServiceError } from '@/lib/serviceError';

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

const buildProductRecord = async (db: D1Database, productId: string): Promise<ExportedProductRecord> => {
  const result = await db
    .prepare(
      `SELECT id, product_name, product_price, product_id, strategy, strategy_name, content, published_url, product_payload, source_json_raw, created_at
       FROM Article
       WHERE product_id = ?
       ORDER BY created_at DESC`
    )
    .bind(productId)
    .all();

  const rows = (result.results ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    throw new ServiceError(404, '未找到对应 product_id 的记录', 'product_not_found');
  }

  let product: Record<string, unknown> | null = null;
  for (const r of rows) {
    const sourceJsonRaw = typeof r.source_json_raw === 'string' ? r.source_json_raw : '';
    if (sourceJsonRaw) {
      try {
        const parsed = JSON.parse(sourceJsonRaw);
        if (parsed && typeof parsed === 'object') {
          product = parsed as Record<string, unknown>;
          break;
        }
      } catch {
        // fallback to product_payload
      }
    }
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

  return {
    product,
    articles,
    db_ref: { table: 'Article', product_id: productId, article_ids: articles.map((a) => a.article_id).filter(Boolean) },
    exported_at: new Date().toISOString(),
  };
};

export async function exportProduct(db: D1Database, productId: string) {
  const normalized = productId.trim();
  if (!normalized) {
    throw new ServiceError(400, '缺少 product_id', 'missing_product_id');
  }

  const payload = await buildProductRecord(db, normalized);
  return {
    filename: `product-${normalized}.json`,
    payload,
  };
}

export async function exportProducts(db: D1Database, productIdsInput: unknown) {
  const productIds = Array.isArray(productIdsInput)
    ? productIdsInput.filter((item): item is string => typeof item === 'string')
    : [];
  const unique = Array.from(new Set(productIds.map((item) => item.trim()).filter(Boolean)));
  if (unique.length === 0) {
    throw new ServiceError(400, '缺少 product_ids', 'missing_product_ids');
  }
  if (unique.length > 200) {
    throw new ServiceError(400, 'product_ids 过多（最多 200）', 'too_many_product_ids');
  }

  const records: ExportedProductRecord[] = [];
  for (const productId of unique) {
    try {
      records.push(await buildProductRecord(db, productId));
    } catch (error) {
      if (error instanceof ServiceError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  return {
    filename: `products-${unique.length}.json`,
    payload: records,
  };
}
