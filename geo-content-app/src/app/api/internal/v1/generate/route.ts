import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { generateAndMaybePersist } from '@/lib/services/internalGenerateService';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const body = (await req.json()) as Record<string, unknown>;
    return NextResponse.json(await generateAndMaybePersist(req, db, body));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to generate internal content');
  }
}

