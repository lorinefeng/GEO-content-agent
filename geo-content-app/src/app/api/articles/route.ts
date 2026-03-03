import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode | null => {
  if (raw === 'sku' || raw === 'brand_ip') return raw;
  return null;
};

export async function GET(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const strategy = searchParams.get('strategy');
  const mode = parseMode(searchParams.get('mode'));
  const db = await ensureDatabaseReady(getD1Database());

  try {
    const baseSelect =
      `SELECT
        a.id, a.mode, a.subject_id, a.subject_name, a.subject_payload,
        a.product_name, a.product_price, a.product_id,
        a.strategy, a.strategy_name, a.content, a.published_url,
        a.product_payload, a.research_snapshot_id, a.created_at, a.updated_at,
        rs.sources_json AS research_sources_json,
        rs.queries_json AS research_queries_json
      FROM Article a
      LEFT JOIN ResearchSnapshot rs ON rs.id = a.research_snapshot_id`;

    let query = `${baseSelect} ORDER BY a.created_at DESC LIMIT 50`;
    const binds: string[] = [];

    if (mode && strategy) {
      query = `${baseSelect} WHERE a.mode = ? AND a.strategy = ? ORDER BY a.created_at DESC LIMIT 50`;
      binds.push(mode, strategy);
    } else if (mode) {
      query = `${baseSelect} WHERE a.mode = ? ORDER BY a.created_at DESC LIMIT 50`;
      binds.push(mode);
    } else if (strategy) {
      query = `${baseSelect} WHERE a.strategy = ? ORDER BY a.created_at DESC LIMIT 50`;
      binds.push(strategy);
    }

    const stmt = db.prepare(query).bind(...binds);
    const result = await stmt.all();
    const articles = result?.results ?? [];
    return NextResponse.json({ articles, total: articles.length });
  } catch (error) {
    console.error('Fetch articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());

  try {
    const body = (await req.json()) as {
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
    };

    const mode = body.mode === 'brand_ip' ? 'brand_ip' : 'sku';
    const strategy = typeof body.strategy === 'string' ? body.strategy : '';
    const strategy_name = typeof body.strategy_name === 'string' ? body.strategy_name : '';
    const content = typeof body.content === 'string' ? body.content : '';

    const subject_id = typeof body.subject_id === 'string' ? body.subject_id : '';
    const subject_name = typeof body.subject_name === 'string' ? body.subject_name : '';
    const subject_payload = typeof body.subject_payload === 'string' ? body.subject_payload : '';

    const product_name_raw = typeof body.product_name === 'string' ? body.product_name : '';
    const product_name = product_name_raw || subject_name;

    const product_id_raw = typeof body.product_id === 'string' ? body.product_id : '';
    const product_id = product_id_raw || subject_id;

    const product_payload_raw = typeof body.product_payload === 'string' ? body.product_payload : '';
    const product_payload = product_payload_raw || subject_payload;

    const published_url = typeof body.published_url === 'string' ? body.published_url : '';
    const research_snapshot_id = typeof body.research_snapshot_id === 'string' ? body.research_snapshot_id : '';
    const referenceImages = Array.isArray(body.reference_images)
      ? body.reference_images
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const row = item as Record<string, unknown>;
            const public_url = typeof row.public_url === 'string' ? row.public_url.trim() : typeof row.url === 'string' ? row.url.trim() : '';
            if (!/^https?:\/\//i.test(public_url)) return null;
            const source_type = row.source_type === 'upload' ? 'upload' : 'url';
            const origin_name = typeof row.origin_name === 'string' ? row.origin_name : '';
            const mime_type = typeof row.mime_type === 'string' ? row.mime_type : '';
            const r2_key = typeof row.r2_key === 'string' ? row.r2_key : '';
            return { public_url, source_type, origin_name, mime_type, r2_key };
          })
          .filter((item): item is { public_url: string; source_type: 'upload' | 'url'; origin_name: string; mime_type: string; r2_key: string } => Boolean(item))
          .slice(0, 5)
      : [];

    const priceRaw = body.product_price;
    const parsedPrice =
      typeof priceRaw === 'number'
        ? priceRaw
        : typeof priceRaw === 'string'
          ? Number.parseFloat(priceRaw)
          : NaN;
    const product_price = Number.isFinite(parsedPrice) ? parsedPrice : mode === 'brand_ip' ? 0 : NaN;

    if (!product_name || !strategy || !strategy_name || !content || !Number.isFinite(product_price)) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 });
    }

    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO Article (
          id, mode, subject_id, subject_name, subject_payload,
          product_name, product_price, product_id,
          strategy, strategy_name, content,
          published_url, product_payload, research_snapshot_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        id,
        mode,
        subject_id || null,
        subject_name || product_name,
        subject_payload || null,
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

    const created = await db
      .prepare(
        `SELECT
          a.id, a.mode, a.subject_id, a.subject_name, a.subject_payload,
          a.product_name, a.product_price, a.product_id,
          a.strategy, a.strategy_name, a.content, a.published_url,
          a.product_payload, a.research_snapshot_id, a.created_at, a.updated_at,
          rs.sources_json AS research_sources_json,
          rs.queries_json AS research_queries_json
        FROM Article a
        LEFT JOIN ResearchSnapshot rs ON rs.id = a.research_snapshot_id
        WHERE a.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ success: true, article: created });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
