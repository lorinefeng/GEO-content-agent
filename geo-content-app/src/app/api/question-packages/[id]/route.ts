import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';
import { normalizeQuestionPackagePayload } from '@/lib/questionPackages';

export const runtime = 'edge';

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
      return NextResponse.json({ error: '问题包不存在' }, { status: 404 });
    }

    return NextResponse.json({ package: row });
  } catch (error) {
    console.error('Fetch question package detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch question package detail' }, { status: 500 });
  }
}

export async function PATCH(
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
      return NextResponse.json({ error: '问题包不存在' }, { status: 404 });
    }

    const body = (await req.json()) as { package_json?: unknown };
    const nextRaw = parsePackageJsonInput(body.package_json);
    if (!nextRaw || typeof nextRaw !== 'object') {
      return NextResponse.json({ error: 'package_json 必须是合法 JSON' }, { status: 400 });
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
      {
        articleId: typeof existing.article_id === 'string' ? existing.article_id : '',
        productId: typeof existing.product_id === 'string' ? existing.product_id : '',
        productName: typeof existing.product_name === 'string' ? existing.product_name : '',
        strategy: typeof existing.strategy === 'string' ? existing.strategy : '',
        strategyName: typeof existing.strategy_name === 'string' ? existing.strategy_name : '',
        productPrice: typeof existing.product_price === 'number' ? existing.product_price : 0,
        productPayload: typeof existing.product_payload === 'string' ? existing.product_payload : null,
        sourceJsonRaw: typeof existing.source_json_raw === 'string' ? existing.source_json_raw : null,
        content: typeof existing.content === 'string' ? existing.content : '',
      },
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

    const updated = await db
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

    return NextResponse.json({ success: true, package: updated });
  } catch (error) {
    console.error('Update question package error:', error);
    return NextResponse.json({ error: 'Failed to update question package' }, { status: 500 });
  }
}

