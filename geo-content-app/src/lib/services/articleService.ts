import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { generateQuestionPackagePayload, upsertQuestionPackage } from '@/lib/questionPackages';
import { ServiceError, ensureString } from '@/lib/serviceError';
import type { ContentMode } from '@/lib/services/strategyService';
import {
  getSharedQuestionKeywordsForProduct,
  syncQuestionPackageKeywordsForProduct,
} from '@/lib/services/questionPackageService';

type ReferenceImageInput = {
  public_url: string;
  source_type: 'upload' | 'url';
  origin_name?: string;
  mime_type?: string;
  r2_key?: string;
};

export type CreateArticleInput = {
  mode?: unknown;
  subject_id?: unknown;
  subject_name?: unknown;
  subject_payload?: unknown;
  product_name?: unknown;
  product_price?: unknown;
  product_id?: unknown;
  product_payload?: unknown;
  strategy?: unknown;
  strategy_name?: unknown;
  content?: unknown;
  published_url?: unknown;
  research_snapshot_id?: unknown;
  reference_images?: unknown;
  source_json_raw?: unknown;
};

const BASE_ARTICLE_SELECT = `SELECT
  a.id, a.mode, a.subject_id, a.subject_name, a.subject_payload,
  a.source_json_raw,
  a.product_name, a.product_price, a.product_id,
  a.strategy, a.strategy_name, a.content, a.published_url,
  a.product_payload, a.research_snapshot_id, a.created_at, a.updated_at,
  rs.sources_json AS research_sources_json,
  rs.queries_json AS research_queries_json
FROM Article a
LEFT JOIN ResearchSnapshot rs ON rs.id = a.research_snapshot_id`;

export const parseMode = (raw: string | null | undefined): ContentMode | null => {
  if (raw === 'sku' || raw === 'brand_ip') return raw;
  return null;
};

export const normalizePublishedUrl = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (trimmed.length > 2048) return null;
  return trimmed;
};

const parseReferenceImages = (input: unknown): ReferenceImageInput[] => {
  if (!Array.isArray(input)) return [];
  const images: ReferenceImageInput[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const public_url =
      typeof row.public_url === 'string'
        ? row.public_url.trim()
        : typeof row.url === 'string'
          ? row.url.trim()
          : '';
    if (!/^https?:\/\//i.test(public_url)) continue;
    images.push({
      public_url,
      source_type: row.source_type === 'upload' ? 'upload' : 'url',
      origin_name: ensureString(row.origin_name) || undefined,
      mime_type: ensureString(row.mime_type) || undefined,
      r2_key: ensureString(row.r2_key) || undefined,
    });
    if (images.length >= 5) break;
  }
  return images;
};

export async function listArticles(
  db: D1Database,
  options: { mode?: ContentMode | null; strategy?: string | null; limit?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const binds: string[] = [];
  let query = `${BASE_ARTICLE_SELECT} ORDER BY a.created_at DESC LIMIT ${limit}`;

  if (options.mode && options.strategy) {
    query = `${BASE_ARTICLE_SELECT} WHERE a.mode = ? AND a.strategy = ? ORDER BY a.created_at DESC LIMIT ${limit}`;
    binds.push(options.mode, options.strategy);
  } else if (options.mode) {
    query = `${BASE_ARTICLE_SELECT} WHERE a.mode = ? ORDER BY a.created_at DESC LIMIT ${limit}`;
    binds.push(options.mode);
  } else if (options.strategy) {
    query = `${BASE_ARTICLE_SELECT} WHERE a.strategy = ? ORDER BY a.created_at DESC LIMIT ${limit}`;
    binds.push(options.strategy);
  }

  const result = await db.prepare(query).bind(...binds).all();
  const articles = result?.results ?? [];
  return { articles, total: articles.length };
}

export async function getArticleById(db: D1Database, id: string) {
  const row = await db.prepare(`${BASE_ARTICLE_SELECT} WHERE a.id = ?`).bind(id).first();
  if (!row) {
    throw new ServiceError(404, '文章不存在', 'article_not_found');
  }
  return row;
}

export async function createArticle(db: D1Database, input: CreateArticleInput) {
  const mode = input.mode === 'brand_ip' ? 'brand_ip' : 'sku';
  const strategy = ensureString(input.strategy);
  const strategy_name = ensureString(input.strategy_name);
  const content = ensureString(input.content);

  const subject_id = ensureString(input.subject_id);
  const subject_name = ensureString(input.subject_name);
  const subject_payload = ensureString(input.subject_payload);

  const product_name_raw = ensureString(input.product_name);
  const product_name = product_name_raw || subject_name;
  const product_id_raw = ensureString(input.product_id);
  const product_id = product_id_raw || subject_id;
  const product_payload_raw = ensureString(input.product_payload);
  const product_payload = product_payload_raw || subject_payload;
  const source_json_raw_input = ensureString(input.source_json_raw);
  const source_json_raw = source_json_raw_input || (mode === 'sku' ? product_payload || subject_payload : '');

  const published_url = ensureString(input.published_url);
  const research_snapshot_id = ensureString(input.research_snapshot_id);
  const referenceImages = parseReferenceImages(input.reference_images);

  const priceRaw = input.product_price;
  const parsedPrice =
    typeof priceRaw === 'number'
      ? priceRaw
      : typeof priceRaw === 'string'
        ? Number.parseFloat(priceRaw)
        : Number.NaN;
  const product_price = Number.isFinite(parsedPrice) ? parsedPrice : mode === 'brand_ip' ? 0 : Number.NaN;

  if (!product_name || !strategy || !strategy_name || !content || !Number.isFinite(product_price)) {
    throw new ServiceError(400, '参数不合法', 'invalid_article_payload');
  }
  if (source_json_raw.length > 500_000) {
    throw new ServiceError(400, 'source_json_raw 过大（最大 500000 字符）', 'source_json_too_large');
  }

  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO Article (
        id, mode, subject_id, subject_name, subject_payload,
        source_json_raw,
        product_name, product_price, product_id,
        strategy, strategy_name, content,
        published_url, product_payload, research_snapshot_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      mode,
      subject_id || null,
      subject_name || product_name,
      subject_payload || null,
      source_json_raw || null,
      product_name,
      product_price,
      product_id || null,
      strategy,
      strategy_name,
      content,
      published_url || null,
      product_payload || null,
      research_snapshot_id || null
    )
    .run();

  for (const image of referenceImages) {
    await db
      .prepare(
        `INSERT INTO ReferenceImageAsset (
          id, article_id, subject_id, mode, source_type, origin_name, mime_type, public_url, r2_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        crypto.randomUUID(),
        id,
        subject_id || product_id || null,
        mode,
        image.source_type,
        image.origin_name || null,
        image.mime_type || null,
        image.public_url,
        image.r2_key || null
      )
      .run();
  }

  let questionPackageStatus: string | null = null;
  let questionPackageError: string | null = null;
  if (mode === 'sku') {
    try {
      const packageInput = {
        articleId: id,
        productId: product_id || subject_id || id,
        productName: product_name,
        strategy,
        strategyName: strategy_name,
        productPrice: product_price,
        productPayload: product_payload || subject_payload || null,
        sourceJsonRaw: source_json_raw || null,
        content,
      };
      const sharedKeywords = await getSharedQuestionKeywordsForProduct(db, packageInput);
      const packageResult = await generateQuestionPackagePayload(packageInput, { fixedKeywords: sharedKeywords });
      questionPackageStatus = packageResult.status;
      questionPackageError = packageResult.errorMessage || null;

      await upsertQuestionPackage(
        db,
        packageInput,
        packageResult.payload,
        packageResult.status,
        packageResult.errorMessage
      );
      await syncQuestionPackageKeywordsForProduct(db, packageInput.productId, packageResult.payload.keywords);
    } catch (error) {
      questionPackageStatus = 'failed';
      questionPackageError = error instanceof Error ? error.message : String(error);
    }
  }

  const article = await getArticleById(db, id);
  return {
    success: true,
    article,
    question_package_status: questionPackageStatus,
    question_package_error: questionPackageError,
  };
}

export async function updateArticlePublishedUrl(db: D1Database, id: string, publishedUrl: unknown) {
  const normalized = normalizePublishedUrl(publishedUrl);
  if (normalized === null) {
    throw new ServiceError(400, 'URL 不合法（需以 http:// 或 https:// 开头）', 'invalid_published_url');
  }

  await db
    .prepare(`UPDATE Article SET published_url = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(normalized || null, id)
    .run();

  return {
    success: true,
    article: await getArticleById(db, id),
  };
}

export async function deleteArticle(db: D1Database, id: string, bucket?: R2Bucket | null) {
  const deleted = await getArticleById(db, id);

  const refRows = await db
    .prepare(`SELECT r2_key FROM ReferenceImageAsset WHERE article_id = ? AND r2_key IS NOT NULL AND r2_key != ''`)
    .bind(id)
    .all();

  await db.prepare('DELETE FROM ReferenceImageAsset WHERE article_id = ?').bind(id).run();
  await db.prepare('DELETE FROM QuestionPackage WHERE article_id = ?').bind(id).run();
  await db.prepare('DELETE FROM Article WHERE id = ?').bind(id).run();

  const keys = (refRows.results ?? [])
    .map((row) => (row as { r2_key?: unknown }).r2_key)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

  if (bucket && keys.length > 0) {
    await Promise.all(keys.map((key) => bucket.delete(key).catch(() => undefined)));
  }

  return { success: true, deleted };
}
