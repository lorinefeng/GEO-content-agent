import { NextResponse } from 'next/server';
import { getCloudflareEnv, getD1Database } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function GET() {
  const env = getCloudflareEnv();

  const hasOpenAIKey = typeof env.OPENAI_API_KEY === 'string' && env.OPENAI_API_KEY.length > 0;
  const hasOpenAIBaseUrl = typeof env.OPENAI_BASE_URL === 'string' && env.OPENAI_BASE_URL.length > 0;
  const openAIModel = typeof env.OPENAI_MODEL === 'string' && env.OPENAI_MODEL ? env.OPENAI_MODEL : undefined;

  let d1Bound = true;
  let d1Tables: { Article: boolean; Template: boolean } | undefined;
  let d1Error: string | undefined;

  try {
    const db = getD1Database();
    const rows = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Article','Template')"
      )
      .all();
    const names = new Set((rows?.results ?? []).map((r) => (r as { name?: unknown }).name).filter((n): n is string => typeof n === 'string'));
    d1Tables = {
      Article: names.has('Article'),
      Template: names.has('Template'),
    };
  } catch (err: unknown) {
    d1Bound = false;
    d1Error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: true,
    env: {
      OPENAI_API_KEY: hasOpenAIKey,
      OPENAI_BASE_URL: hasOpenAIBaseUrl,
      OPENAI_MODEL: openAIModel ?? null,
    },
    d1: {
      bound: d1Bound,
      tables: d1Tables ?? null,
      error: d1Error ?? null,
    },
  });
}

