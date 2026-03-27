import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { parseContentMode } from '@/lib/services/strategyService';
import { upsertTemplate } from '@/lib/services/templateService';

export const runtime = 'edge';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ strategy: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { strategy } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const mode = parseContentMode(searchParams.get('mode'));
    const body = (await req.json()) as { prompt?: unknown; name?: unknown };
    return NextResponse.json(await upsertTemplate(db, { mode, strategy, prompt: body.prompt, name: body.name, actorId: 'internal_api' }));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to update internal template');
  }
}

