import type { D1Database } from '@cloudflare/workers-types';
import { ServiceError, ensureString } from '@/lib/serviceError';
import type { ContentMode } from '@/lib/services/strategyService';

export async function listTemplates(db: D1Database, mode: ContentMode) {
  const result = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? ORDER BY strategy ASC')
    .bind(mode)
    .all();
  return { mode, templates: result?.results ?? [] };
}

export async function upsertTemplate(
  db: D1Database,
  input: { mode: ContentMode; strategy: string; prompt: unknown; name?: unknown; actorId?: string | null }
) {
  const strategy = input.strategy.trim();
  if (!strategy) {
    throw new ServiceError(400, '缺少 strategy', 'missing_strategy');
  }

  const prompt = ensureString(input.prompt);
  if (!prompt) {
    throw new ServiceError(400, 'prompt 不能为空', 'missing_prompt');
  }

  const existing = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
    .bind(input.mode, strategy)
    .first();

  if (existing && typeof (existing as { prompt?: unknown }).prompt === 'string') {
    const prev = existing as { name?: unknown; prompt?: unknown };
    await db
      .prepare(
        "INSERT INTO TemplateRevision (id, mode, strategy, name, prompt, changed_at, changed_by) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)"
      )
      .bind(
        crypto.randomUUID(),
        input.mode,
        strategy,
        typeof prev.name === 'string' ? prev.name : strategy,
        typeof prev.prompt === 'string' ? prev.prompt : '',
        input.actorId ?? null
      )
      .run();
  }

  const templateName = ensureString(input.name) || strategy;
  await db
    .prepare(
      'INSERT INTO Template (mode, strategy, name, prompt) VALUES (?, ?, ?, ?) ON CONFLICT(mode, strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt'
    )
    .bind(input.mode, strategy, templateName, prompt)
    .run();

  const template = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
    .bind(input.mode, strategy)
    .first();

  return { success: true, mode: input.mode, template };
}

export async function listTemplateRevisions(db: D1Database, mode: ContentMode, strategy: string) {
  if (!strategy.trim()) {
    throw new ServiceError(400, '缺少 strategy', 'missing_strategy');
  }

  const result = await db
    .prepare(
      'SELECT id, mode, strategy, name, prompt, changed_at, changed_by FROM TemplateRevision WHERE mode = ? AND strategy = ? ORDER BY changed_at DESC LIMIT 50'
    )
    .bind(mode, strategy)
    .all();

  return { mode, revisions: result?.results ?? [] };
}

export async function rollbackTemplate(
  db: D1Database,
  input: { mode: ContentMode; strategy: string; revisionId: string; actorId?: string | null }
) {
  const strategy = input.strategy.trim();
  if (!strategy) {
    throw new ServiceError(400, '缺少 strategy', 'missing_strategy');
  }
  if (!input.revisionId.trim()) {
    throw new ServiceError(400, '缺少 revision_id', 'missing_revision_id');
  }

  const revision = await db
    .prepare('SELECT id, mode, strategy, name, prompt FROM TemplateRevision WHERE id = ? AND mode = ? AND strategy = ?')
    .bind(input.revisionId, input.mode, strategy)
    .first();
  if (!revision) {
    throw new ServiceError(404, '变更记录不存在', 'template_revision_not_found');
  }

  const current = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
    .bind(input.mode, strategy)
    .first();

  if (current && typeof (current as { prompt?: unknown }).prompt === 'string') {
    const prev = current as { name?: unknown; prompt?: unknown };
    await db
      .prepare(
        "INSERT INTO TemplateRevision (id, mode, strategy, name, prompt, changed_at, changed_by) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)"
      )
      .bind(
        crypto.randomUUID(),
        input.mode,
        strategy,
        typeof prev.name === 'string' ? prev.name : strategy,
        typeof prev.prompt === 'string' ? prev.prompt : '',
        input.actorId ?? null
      )
      .run();
  }

  const rev = revision as { name?: unknown; prompt?: unknown };
  await db
    .prepare(
      'INSERT INTO Template (mode, strategy, name, prompt) VALUES (?, ?, ?, ?) ON CONFLICT(mode, strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt'
    )
    .bind(input.mode, strategy, typeof rev.name === 'string' ? rev.name : strategy, typeof rev.prompt === 'string' ? rev.prompt : '')
    .run();

  const template = await db
    .prepare('SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy = ?')
    .bind(input.mode, strategy)
    .first();

  return { success: true, mode: input.mode, template };
}
