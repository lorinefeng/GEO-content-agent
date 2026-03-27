import { NextRequest } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';
import { createArticle } from '@/lib/services/articleService';
import { generateContent, type GenerateRequestPayload } from '@/lib/services/generateService';

const ensureObject = (value: unknown) => (value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined);

export async function generateAndMaybePersist(
  req: NextRequest,
  db: D1Database,
  body: GenerateRequestPayload & { save_articles?: unknown }
) {
  const result = await generateContent(req, db, body);
  const saveArticles = body.save_articles !== false;

  if (!saveArticles || result.articles.length === 0) {
    return {
      ...result,
      saved_articles: [],
    };
  }

  const mode = result.mode;
  const subjectId =
    typeof body.subject_id === 'string' && body.subject_id.trim() ? body.subject_id.trim() : crypto.randomUUID();
  const subjectEntity = ensureObject(mode === 'brand_ip' ? body.brand : body.product) ?? {};
  const subjectName = typeof subjectEntity.name === 'string' && subjectEntity.name.trim() ? subjectEntity.name.trim() : '未命名主体';
  const subjectPayload = JSON.stringify(subjectEntity);
  const productPriceRaw = subjectEntity.price;
  const productPrice =
    typeof productPriceRaw === 'number'
      ? productPriceRaw
      : typeof productPriceRaw === 'string'
        ? Number.parseFloat(productPriceRaw)
        : 0;

  const savedArticles = [];
  for (const article of result.articles) {
    const saved = await createArticle(db, {
      mode,
      subject_id: subjectId,
      subject_name: subjectName,
      subject_payload: subjectPayload,
      product_name: subjectName,
      product_price: mode === 'brand_ip' ? 0 : productPrice,
      product_id: subjectId,
      product_payload: subjectPayload,
      strategy: article.strategy,
      strategy_name: article.strategy_name,
      content: article.content,
      research_snapshot_id: result.research_snapshot_id,
      reference_images: result.reference_images,
      source_json_raw: mode === 'sku' && typeof subjectEntity.source_json_raw === 'string' ? subjectEntity.source_json_raw : undefined,
    });
    savedArticles.push(saved.article);
  }

  return {
    ...result,
    subject_id: subjectId,
    saved_articles: savedArticles,
  };
}
