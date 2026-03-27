import { NextRequest, NextResponse } from 'next/server';
import { getStrategies, parseContentMode } from '@/lib/services/strategyService';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = parseContentMode(searchParams.get('mode'));

  return NextResponse.json({
    mode,
    strategies: getStrategies(mode),
  });
}
