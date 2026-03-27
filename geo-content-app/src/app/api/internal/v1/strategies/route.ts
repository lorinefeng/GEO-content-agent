import { NextRequest, NextResponse } from 'next/server';
import { assertInternalApiAccess } from '@/lib/internalApiAuth';
import { getStrategies, parseContentMode } from '@/lib/services/strategyService';
import { serviceErrorResponse } from '@/lib/routeResponses';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    assertInternalApiAccess(req);
    const { searchParams } = new URL(req.url);
    const mode = parseContentMode(searchParams.get('mode'));
    return NextResponse.json({ mode, strategies: getStrategies(mode) });
  } catch (error) {
    return serviceErrorResponse(error, 'Failed to fetch internal strategies');
  }
}

