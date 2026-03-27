import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { parseContentMode } from '@/lib/services/strategyService';
import { rollbackTemplate } from '@/lib/services/templateService';

export const runtime = 'edge';

export async function POST(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { strategy } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const mode = parseContentMode(searchParams.get('mode'));
    const body = (await req.json()) as { revision_id?: unknown };
    return NextResponse.json(
      await rollbackTemplate(db, {
        mode,
        strategy,
        revisionId: typeof body.revision_id === 'string' ? body.revision_id : '',
        actorId: 'internal_api',
      })
    );
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to rollback internal template');
  }
}

