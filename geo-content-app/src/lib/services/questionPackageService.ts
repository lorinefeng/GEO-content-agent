import type { D1Database } from '@cloudflare/workers-types';
import {
  buildCanonicalQuestionKeywords,
  normalizeQuestionKeywords,
  normalizeQuestionPackagePayload,
  type QuestionKeyword,
  type QuestionPackageInput,
} from '@/lib/questionPackages';
import { ServiceError } from '@/lib/serviceError';

const parsePackageJsonInput = (raw: unknown) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
};

const buildQuestionPackageInputFromRow = (row: Record<string, unknown>): QuestionPackageInput => ({
  articleId: typeof row.article_id === 'string' ? row.article_id : '',
  productId: typeof row.product_id === 'string' ? row.product_id : '',
  productName: typeof row.product_name === 'string' ? row.product_name : '',
  strategy: typeof row.strategy === 'string' ? row.strategy : '',
  strategyName: typeof row.strategy_name === 'string' ? row.strategy_name : '',
  productPrice: typeof row.product_price === 'number' ? row.product_price : 0,
  productPayload: typeof row.product_payload === 'string' ? row.product_payload : null,
  sourceJsonRaw: typeof row.source_json_raw === 'string' ? row.source_json_raw : null,
  content: typeof row.content === 'string' ? row.content : '',
});

const parseStoredPackageJson = (raw: unknown) => {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export async function getSharedQuestionKeywordsForProduct(db: D1Database, input: QuestionPackageInput): Promise<QuestionKeyword[]> {
  const normalizedProductId = input.productId.trim();
  const canonical = buildCanonicalQuestionKeywords(input);
  if (!normalizedProductId) return canonical;

  const result = await db
    .prepare(
      `SELECT
        qp.package_json, qp.status,
        qp.article_id, qp.product_id, qp.product_name,
        qp.strategy, qp.strategy_name,
        a.product_price, a.product_payload, a.source_json_raw, a.content
      FROM QuestionPackage qp
      LEFT JOIN Article a ON a.id = qp.article_id
      WHERE qp.mode = 'sku' AND qp.product_id = ?
      ORDER BY CASE WHEN qp.status = 'edited' THEN 0 ELSE 1 END, qp.updated_at DESC, qp.created_at DESC
      LIMIT 20`
    )
    .bind(normalizedProductId)
    .all();

  for (const row of result.results ?? []) {
    const record = row as Record<string, unknown>;
    if (record.status !== 'edited') continue;
    const parsed = parseStoredPackageJson(record.package_json);
    if (!parsed) continue;
    const normalized = normalizeQuestionKeywords(parsed.keywords, canonical);
    if (normalized.length > 0) return normalized;
  }

  return canonical;
}

export async function syncQuestionPackageKeywordsForProduct(
  db: D1Database,
  productId: string,
  keywords: QuestionKeyword[]
) {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId || keywords.length === 0) return;

  const result = await db
    .prepare(
      `SELECT
        qp.id, qp.package_json,
        qp.article_id, qp.product_id, qp.product_name,
        qp.strategy, qp.strategy_name,
        a.product_price, a.product_payload, a.source_json_raw, a.content
      FROM QuestionPackage qp
      LEFT JOIN Article a ON a.id = qp.article_id
      WHERE qp.mode = 'sku' AND qp.product_id = ?`
    )
    .bind(normalizedProductId)
    .all();

  for (const row of result.results ?? []) {
    const record = row as Record<string, unknown>;
    const parsed = parseStoredPackageJson(record.package_json);
    if (!parsed) continue;

    let existingGeneratedAt: string | null = null;
    if (typeof parsed.generated_at === 'string') {
      existingGeneratedAt = parsed.generated_at;
    }

    const normalizedPayload = normalizeQuestionPackagePayload(parsed, buildQuestionPackageInputFromRow(record), {
      preserveGeneratedAt: existingGeneratedAt,
      fixedKeywords: keywords,
    });

    await db
      .prepare(`UPDATE QuestionPackage SET package_json = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(JSON.stringify(normalizedPayload, null, 2), record.id)
      .run();
  }
}

export async function listQuestionPackages(db: D1Database) {
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

  return { packages: result.results ?? [] };
}

export async function getQuestionPackageById(db: D1Database, id: string) {
  if (!id.trim()) {
    throw new ServiceError(400, '缺少 id', 'missing_id');
  }
  const row = await db
    .prepare(
      `SELECT
        qp.id, qp.article_id, qp.mode, qp.product_id, qp.product_name,
        qp.strategy, qp.strategy_name, qp.status, qp.error_message,
        qp.package_json, qp.created_at, qp.updated_at,
        a.created_at AS article_created_at
      FROM QuestionPackage qp
      LEFT JOIN Article a ON a.id = qp.article_id
      WHERE qp.id = ?`
    )
    .bind(id)
    .first();

  if (!row) {
    throw new ServiceError(404, '问题包不存在', 'question_package_not_found');
  }

  return { package: row };
}

export async function updateQuestionPackage(db: D1Database, id: string, packageJson: unknown) {
  if (!id.trim()) {
    throw new ServiceError(400, '缺少 id', 'missing_id');
  }

  const existing = (await db
    .prepare(
      `SELECT
        qp.id, qp.article_id, qp.product_id, qp.product_name,
        qp.strategy, qp.strategy_name, qp.package_json,
        a.product_price, a.product_payload, a.source_json_raw, a.content
      FROM QuestionPackage qp
      LEFT JOIN Article a ON a.id = qp.article_id
      WHERE qp.id = ?`
    )
    .bind(id)
    .first()) as Record<string, unknown> | null;

  if (!existing) {
    throw new ServiceError(404, '问题包不存在', 'question_package_not_found');
  }

  const nextRaw = parsePackageJsonInput(packageJson);
  if (!nextRaw || typeof nextRaw !== 'object') {
    throw new ServiceError(400, 'package_json 必须是合法 JSON', 'invalid_package_json');
  }

  let existingGeneratedAt: string | null = null;
  if (typeof existing.package_json === 'string') {
    try {
      const parsed = JSON.parse(existing.package_json) as { generated_at?: unknown };
      existingGeneratedAt = typeof parsed.generated_at === 'string' ? parsed.generated_at : null;
    } catch {
      existingGeneratedAt = null;
    }
  }

  const normalized = normalizeQuestionPackagePayload(
    nextRaw,
    buildQuestionPackageInputFromRow(existing),
    { preserveGeneratedAt: existingGeneratedAt }
  );

  await db
    .prepare(
      `UPDATE QuestionPackage
       SET package_json = ?, status = 'edited', error_message = NULL, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(JSON.stringify(normalized, null, 2), id)
    .run();

  await syncQuestionPackageKeywordsForProduct(
    db,
    typeof existing.product_id === 'string' ? existing.product_id : '',
    normalized.keywords
  );

  return {
    success: true,
    ...(await getQuestionPackageById(db, id)),
  };
}

export async function exportQuestionPackages(db: D1Database, idsInput: unknown) {
  const ids = Array.isArray(idsInput) ? idsInput.filter((item): item is string => typeof item === 'string') : [];
  const unique = Array.from(new Set(ids.map((item) => item.trim()).filter(Boolean)));
  if (unique.length === 0) {
    throw new ServiceError(400, '缺少 ids', 'missing_ids');
  }
  if (unique.length > 200) {
    throw new ServiceError(400, '批量导出数量过多（最多 200）', 'too_many_ids');
  }

  const items: unknown[] = [];
  for (const id of unique) {
    const row = (await db.prepare(`SELECT package_json FROM QuestionPackage WHERE id = ?`).bind(id).first()) as Record<string, unknown> | null;
    if (!row || typeof row.package_json !== 'string') continue;
    try {
      items.push(JSON.parse(row.package_json));
    } catch {
      continue;
    }
  }

  return {
    filename: `question-packages-${unique.length}.json`,
    payload: items,
  };
}

export async function exportQuestionPackageById(db: D1Database, id: string) {
  const normalized = id.trim();
  if (!normalized) {
    throw new ServiceError(400, '缺少 id', 'missing_id');
  }

  const row = (await db
    .prepare(`SELECT product_name, strategy, package_json FROM QuestionPackage WHERE id = ?`)
    .bind(normalized)
    .first()) as Record<string, unknown> | null;

  if (!row) {
    throw new ServiceError(404, '问题包不存在', 'question_package_not_found');
  }

  const safeFileName = (value: string) => value.replace(/[^\w\u4e00-\u9fa5\-]+/g, '-').slice(0, 60) || 'question-package';
  const productName = typeof row.product_name === 'string' ? row.product_name : 'question-package';
  const strategy = typeof row.strategy === 'string' ? row.strategy : 'sku';
  const packageJson = typeof row.package_json === 'string' ? JSON.parse(row.package_json) : {};

  return {
    filename: `${safeFileName(productName)}-${safeFileName(strategy)}.json`,
    payload: packageJson,
  };
}
