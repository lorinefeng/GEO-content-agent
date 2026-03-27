import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { listQuestionPackages } from '@/lib/services/questionPackageService';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    return NextResponse.json(await listQuestionPackages(db));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to fetch internal question packages');
  }
}

