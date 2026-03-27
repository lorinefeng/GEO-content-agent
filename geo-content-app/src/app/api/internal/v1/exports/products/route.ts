import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { exportProducts } from '@/lib/services/exportService';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const body = (await req.json()) as { product_ids?: unknown };
    const { filename, payload } = await exportProducts(db, body.product_ids);
    return NextResponse.json({ filename, payload });
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to export internal products');
  }
}
