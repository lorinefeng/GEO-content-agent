import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { getQuestionPackageById, updateQuestionPackage } from '@/lib/services/questionPackageService';

export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { id } = await ctx.params;
    return NextResponse.json(await getQuestionPackageById(db, id));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to fetch internal question package');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const { id } = await ctx.params;
    const body = (await req.json()) as { package_json?: unknown };
    return NextResponse.json(await updateQuestionPackage(db, id, body.package_json));
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to update internal question package');
  }
}

