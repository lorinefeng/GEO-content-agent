import { NextRequest, NextResponse } from 'next/server';
import { getAssetsBucket, getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { deleteArticle, getArticleById, updateArticlePublishedUrl } from '@/lib/services/articleService';
import { serviceErrorResponse } from '@/lib/routeResponses';

export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { id } = await ctx.params;
    return NextResponse.json({ article: await getArticleById(db, id) });
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to fetch internal article');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { id } = await ctx.params;
    const body = (await req.json()) as { published_url?: unknown };
    return NextResponse.json(await updateArticlePublishedUrl(db, id, body.published_url));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to update internal article');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { id } = await ctx.params;
    let bucket = null;
    try {
      bucket = getAssetsBucket();
    } catch {
      bucket = null;
    }
    return NextResponse.json(await deleteArticle(db, id, bucket));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to delete internal article');
  }
}

