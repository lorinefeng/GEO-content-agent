import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { ServiceError } from '@/lib/serviceError';
import { serviceErrorResponse } from '@/lib/routeResponses';
import { generateAndMaybePersist } from '@/lib/services/internalGenerateService';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const db = await ensureDatabaseReady(getD1Database());
    const body = (await req.json()) as { items?: unknown; stop_on_error?: unknown };
    const items = Array.isArray(body.items) ? body.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
    if (items.length === 0) {
      throw new ServiceError(400, '缺少 items', 'missing_items');
    }
    if (items.length > 20) {
      throw new ServiceError(400, '单次 batch 最多 20 条', 'too_many_batch_items');
    }

    const stopOnError = body.stop_on_error === true;
    const results = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      try {
        results.push({
          index,
          success: true,
          result: await generateAndMaybePersist(req, db, item),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          index,
          success: false,
          error: message,
        });
        if (stopOnError) {
          break;
        }
      }
    }

    return NextResponse.json({
      total: items.length,
      success_count: results.filter((item) => item.success).length,
      failure_count: results.filter((item) => !item.success).length,
      results,
    });
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to batch generate internal content');
  }
}

