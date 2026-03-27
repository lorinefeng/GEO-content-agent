import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { exportProduct } from '@/lib/services/exportService';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('product_id') || '';
    const db = await ensureDatabaseReady(getD1Database());
    const { filename, payload } = await exportProduct(db, productId);
    return NextResponse.json({ filename, payload });
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to export internal product');
  }
}

