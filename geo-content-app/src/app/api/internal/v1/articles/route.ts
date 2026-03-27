import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { createArticle, listArticles, parseMode } from '@/lib/services/articleService';
import { serviceErrorResponse } from '@/lib/routeResponses';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const { searchParams } = new URL(req.url);
    const strategy = searchParams.get('strategy');
    const mode = parseMode(searchParams.get('mode'));
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const db = await ensureDatabaseReady(getD1Database());
    return NextResponse.json(await listArticles(db, { mode, strategy, limit }));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to fetch internal articles');
  }
}

export async function POST(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const body = (await req.json()) as Record<string, unknown>;
    return NextResponse.json(await createArticle(db, body));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to create internal article');
  }
}

