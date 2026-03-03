import { NextRequest, NextResponse } from 'next/server';
import { getAssetsBucket } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await ctx.params;
    const decodedKey = (key || []).map((segment) => decodeURIComponent(segment)).join('/');
    if (!decodedKey) {
      return NextResponse.json({ error: '缺少key' }, { status: 400 });
    }

    const bucket = getAssetsBucket();
    const object = await bucket.get(decodedKey);
    if (!object) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    const headers = new Headers();
    if (object.httpMetadata?.contentType) headers.set('Content-Type', object.httpMetadata.contentType);
    if (object.httpMetadata?.contentDisposition) headers.set('Content-Disposition', object.httpMetadata.contentDisposition);
    if (object.httpMetadata?.contentEncoding) headers.set('Content-Encoding', object.httpMetadata.contentEncoding);
    if (object.httpMetadata?.contentLanguage) headers.set('Content-Language', object.httpMetadata.contentLanguage);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    const buffer = await object.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Public reference image fetch error:', error);
    const message = error instanceof Error ? error.message : '读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
