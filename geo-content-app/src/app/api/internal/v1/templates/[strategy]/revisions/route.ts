import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { parseContentMode } from '@/lib/services/strategyService';
import { listTemplateRevisions } from '@/lib/services/templateService';

export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { strategy } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const mode = parseContentMode(searchParams.get('mode'));
    return NextResponse.json(await listTemplateRevisions(db, mode, strategy));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to fetch internal template revisions');
  }
}

