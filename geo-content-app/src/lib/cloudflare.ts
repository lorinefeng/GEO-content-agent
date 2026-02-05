import { getRequestContext } from '@cloudflare/next-on-pages';
import type { D1Database } from '@cloudflare/workers-types';

export type CloudflareEnv = Record<string, unknown>;

export interface CloudflareEnvBindings extends CloudflareEnv {
  DB?: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
}

export function getCloudflareEnv(): CloudflareEnvBindings {
  try {
    const ctx = getRequestContext() as unknown as { env?: CloudflareEnvBindings };
    return ctx.env ?? {};
  } catch {
    return (process.env as unknown as CloudflareEnvBindings) ?? {};
  }
}

export function getD1Database(): D1Database {
  const env = getCloudflareEnv();
  const db = env.DB;
  if (!db) {
    throw new Error('D1 数据库未绑定：请在 Cloudflare Pages 绑定 DB');
  }
  return db;
}
