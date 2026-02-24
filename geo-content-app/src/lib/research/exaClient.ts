import { getCloudflareEnv } from '@/lib/cloudflare';
import { runtimeConfig } from '@/config/runtimeConfig';

export interface ExaSearchResult {
  title: string;
  url: string;
  text: string;
  publishedDate?: string;
  score?: number;
}

export interface ExaContentResult {
  url: string;
  title: string;
  text: string;
  publishedDate?: string;
}

interface ExaSearchOptions {
  numResults?: number;
  maxCharacters?: number;
  type?: 'auto' | 'fast';
}

const normalizeBaseUrl = (raw: string) => raw.replace(/\/$/, '');

const resolveExaConfig = () => {
  const env = getCloudflareEnv();
  const apiKey =
    typeof env.EXA_API_KEY === 'string' && env.EXA_API_KEY.trim()
      ? env.EXA_API_KEY.trim()
      : runtimeConfig.exaApiKey;
  const baseUrl =
    typeof env.EXA_SEARCH_BASE_URL === 'string' && env.EXA_SEARCH_BASE_URL.trim()
      ? env.EXA_SEARCH_BASE_URL.trim()
      : runtimeConfig.exaSearchBaseUrl;

  if (!apiKey) {
    throw new Error('EXA_API_KEY 未配置');
  }

  return { apiKey, baseUrl: normalizeBaseUrl(baseUrl) };
};

const exaPost = async <TResponse,>(path: '/search' | '/contents', payload: unknown): Promise<TResponse> => {
  const { apiKey, baseUrl } = resolveExaConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Exa ${path} failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  return (await response.json()) as TResponse;
};

export async function exaSearch(query: string, options?: ExaSearchOptions): Promise<ExaSearchResult[]> {
  const payload = {
    query,
    type: options?.type || runtimeConfig.exaSearchType,
    num_results: options?.numResults || runtimeConfig.exaNumResults,
    contents: {
      text: {
        max_characters: options?.maxCharacters || runtimeConfig.exaTextMaxCharacters,
      },
    },
  };

  const data = await exaPost<{
    results?: Array<{
      title?: unknown;
      url?: unknown;
      text?: unknown;
      publishedDate?: unknown;
      score?: unknown;
    }>;
  }>('/search', payload);

  const out: ExaSearchResult[] = [];
  for (const row of data.results ?? []) {
    const title = typeof row.title === 'string' ? row.title : '';
    const url = typeof row.url === 'string' ? row.url : '';
    if (!title || !url) continue;
    out.push({
      title,
      url,
      text: typeof row.text === 'string' ? row.text : '',
      publishedDate: typeof row.publishedDate === 'string' ? row.publishedDate : undefined,
      score: typeof row.score === 'number' ? row.score : undefined,
    });
  }

  return out;
}

export async function exaGetContents(urls: string[], maxCharacters?: number): Promise<ExaContentResult[]> {
  const cleaned = urls.map((url) => url.trim()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const data = await exaPost<{
    results?: Array<{
      url?: unknown;
      title?: unknown;
      text?: unknown;
      publishedDate?: unknown;
    }>;
  }>('/contents', {
    urls: cleaned,
    text: {
      max_characters: maxCharacters || runtimeConfig.exaTextMaxCharacters,
    },
  });

  const out: ExaContentResult[] = [];
  for (const row of data.results ?? []) {
    const url = typeof row.url === 'string' ? row.url : '';
    if (!url) continue;
    out.push({
      url,
      title: typeof row.title === 'string' ? row.title : '',
      text: typeof row.text === 'string' ? row.text : '',
      publishedDate: typeof row.publishedDate === 'string' ? row.publishedDate : undefined,
    });
  }

  return out;
}
