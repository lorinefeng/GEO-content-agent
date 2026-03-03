import { NextRequest, NextResponse } from 'next/server';
import { getAssetsBucket } from '@/lib/cloudflare';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILES = 5;
const MAX_SIZE = 8 * 1024 * 1024;

const safeExt = (name: string, mime: string) => {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg';
};

const makePublicUrl = (req: NextRequest, key: string) => {
  const encodedPath = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const origin = new URL(req.url).origin;
  return `${origin}/api/public/reference-images/${encodedPath}`;
};

export async function POST(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  try {
    const form = await req.formData();
    const mode = form.get('mode');
    const contentMode = mode === 'brand_ip' ? 'brand_ip' : 'sku';
    const files = form.getAll('files').filter((item): item is File => item instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: '请至少上传1张图片' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `单次最多上传 ${MAX_FILES} 张图片` }, { status: 400 });
    }

    const bucket = getAssetsBucket();
    const uploaded: Array<{
      source_type: 'upload';
      origin_name: string;
      mime_type: string;
      public_url: string;
      r2_key: string;
    }> = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: `不支持的图片类型：${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `图片过大：${file.name}，单张最大 8MB` }, { status: 400 });
      }

      const ext = safeExt(file.name, file.type);
      const key = `reference-images/${contentMode}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const buf = await file.arrayBuffer();
      await bucket.put(key, buf, {
        httpMetadata: {
          contentType: file.type,
        },
      });

      uploaded.push({
        source_type: 'upload',
        origin_name: file.name,
        mime_type: file.type,
        public_url: makePublicUrl(req, key),
        r2_key: key,
      });
    }

    return NextResponse.json({ success: true, images: uploaded });
  } catch (error) {
    console.error('Upload reference images error:', error);
    const message = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
