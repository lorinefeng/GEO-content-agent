import { NextResponse } from 'next/server';
import { isServiceError } from '@/lib/serviceError';

export const jsonDownloadResponse = (filename: string, payload: unknown) =>
  new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });

export const serviceErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (isServiceError(error)) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
};
