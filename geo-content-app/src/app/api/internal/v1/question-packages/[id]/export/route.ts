import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { exportQuestionPackageById } from '@/lib/services/questionPackageService';

export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { id } = await ctx.params;
    const { filename, payload } = await exportQuestionPackageById(db, id);
    return NextResponse.json({ filename, payload });
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to export internal question package');
  }
}
