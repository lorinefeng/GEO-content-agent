import { NextResponse } from 'next/server';
import { getCloudflareEnv, getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getBootstrapAdminConfig } from '@/lib/authDb';

export const runtime = 'edge';

export async function GET() {
  const env = getCloudflareEnv();

  const hasOpenAIKey = typeof env.OPENAI_API_KEY === 'string' && env.OPENAI_API_KEY.length > 0;
  const hasOpenAIBaseUrl = typeof env.OPENAI_BASE_URL === 'string' && env.OPENAI_BASE_URL.length > 0;
  const openAIModel = typeof env.OPENAI_MODEL === 'string' && env.OPENAI_MODEL ? env.OPENAI_MODEL : undefined;

  let d1Bound = true;
  let d1Tables:
    | { Article: boolean; Template: boolean; TemplateRevision: boolean; User: boolean; RegistrationRequest: boolean }
    | undefined;
  let d1Error: string | undefined;
  let authBootstrap: { username: string; forceReset: boolean } | undefined;
  let authAdmin: { exists: boolean; role: string | null; status: string | null } | undefined;
  let deployment: { commitSha: string | null; branch: string | null; url: string | null } | undefined;

  try {
    const db = await ensureDatabaseReady(getD1Database());
    const rows = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Article','Template','TemplateRevision','User','RegistrationRequest')"
      )
      .all();
    const names = new Set((rows?.results ?? []).map((r) => (r as { name?: unknown }).name).filter((n): n is string => typeof n === 'string'));
    d1Tables = {
      Article: names.has('Article'),
      Template: names.has('Template'),
      TemplateRevision: names.has('TemplateRevision'),
      User: names.has('User'),
      RegistrationRequest: names.has('RegistrationRequest'),
    };

    const bootstrap = getBootstrapAdminConfig();
    authBootstrap = { username: bootstrap.username, forceReset: bootstrap.forceReset };
    const adminRow = (await db
      .prepare('SELECT role, status FROM User WHERE username = ? LIMIT 1')
      .bind(bootstrap.username)
      .first()) as { role?: unknown; status?: unknown } | null;
    authAdmin = {
      exists: Boolean(adminRow),
      role: typeof adminRow?.role === 'string' ? adminRow.role : null,
      status: typeof adminRow?.status === 'string' ? adminRow.status : null,
    };

    deployment = {
      commitSha: typeof env.CF_PAGES_COMMIT_SHA === 'string' ? env.CF_PAGES_COMMIT_SHA : null,
      branch: typeof env.CF_PAGES_BRANCH === 'string' ? env.CF_PAGES_BRANCH : null,
      url: typeof env.CF_PAGES_URL === 'string' ? env.CF_PAGES_URL : null,
    };
  } catch (err: unknown) {
    d1Bound = false;
    d1Error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: true,
    deployment: deployment ?? null,
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
    auth: {
      bootstrap: authBootstrap ?? null,
      admin: authAdmin ?? null,
    },
  });
}
