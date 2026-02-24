import { runtimeConfig } from '@/config/runtimeConfig';
import { exaSearch, type ExaSearchResult } from '@/lib/research/exaClient';

interface ProductInput {
  name: string;
  price: number;
  category?: string;
  tags?: string[];
}

export interface ResearchProcessStep {
  key: string;
  label: string;
  status: 'success' | 'failed' | 'skipped';
  detail?: string;
}

export interface SkuResearchMeta {
  provider: 'exa';
  search_type: string;
  query_count: number;
  source_count: number;
  degraded: boolean;
  degraded_reason?: string;
  queries: string[];
}

export interface SkuCompetitorResearchResult {
  competitorInfo: string;
  sources: Array<{ title: string; url: string }>;
  process: ResearchProcessStep[];
  researchMeta: SkuResearchMeta;
}

const compact = (value: string) => value.replace(/\s+/g, ' ').trim();

const summarize = (text: string, max = 180) => {
  const s = compact(text);
  if (!s) return '该来源未返回可用正文摘要。';
  return s.length > max ? `${s.slice(0, max)}...` : s;
};

const getPriceBand = (price: number) => {
  if (price < 100) return '100元以下';
  if (price < 300) return '100-300元';
  if (price < 600) return '300-600元';
  if (price < 1000) return '600-1000元';
  return '1000元以上';
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const scoreResult = (result: ExaSearchResult, product: ProductInput) => {
  let score = typeof result.score === 'number' ? result.score : 0;
  const domain = getDomain(result.url);
  const fullText = `${result.title} ${result.text}`.toLowerCase();

  if (domain.endsWith('.cn')) score += 2;
  if (domain.includes('jd.com') || domain.includes('tmall') || domain.includes('taobao')) score += 1;
  if (product.category && fullText.includes(product.category.toLowerCase())) score += 1;
  if (fullText.includes('评测') || fullText.includes('对比') || fullText.includes('参数')) score += 1;

  return score;
};

const dedupeByUrl = (rows: ExaSearchResult[]) => {
  const seen = new Set<string>();
  const out: ExaSearchResult[] = [];
  for (const row of rows) {
    const key = row.url.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
};

export async function buildSkuCompetitorResearch(product: ProductInput): Promise<SkuCompetitorResearchResult> {
  const category = product.category?.trim() || '商品';
  const priceBand = getPriceBand(product.price);
  const tags = (product.tags ?? []).slice(0, 5).join(' ');

  const queries = [
    `${product.name} ${category} 评测 对比`,
    `${category} ${priceBand} 同类 评测 中国市场`,
    `${product.name} 替代 竞品 ${tags}`.trim(),
  ];

  const process: ResearchProcessStep[] = [];
  const allResults: ExaSearchResult[] = [];

  for (const query of queries) {
    try {
      const rows = await exaSearch(query, {
        type: 'auto',
        numResults: runtimeConfig.exaNumResults,
        maxCharacters: runtimeConfig.exaTextMaxCharacters,
      });
      allResults.push(...rows);
      process.push({
        key: `query:${query}`,
        label: `检索：${query}`,
        status: 'success',
        detail: `命中 ${rows.length} 条`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      process.push({
        key: `query:${query}`,
        label: `检索：${query}`,
        status: 'failed',
        detail: detail.slice(0, 140),
      });
    }
  }

  const deduped = dedupeByUrl(allResults)
    .map((row) => ({ ...row, score: scoreResult(row, product) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const selected = deduped.slice(0, Math.max(3, runtimeConfig.competitorTopK));

  if (selected.length === 0) {
    return {
      competitorInfo:
        '当前未检索到足够的实时竞品信息。请基于常见同类商品，围绕价格带、材质与适用场景给出审慎且客观的对比评测。',
      sources: [],
      process,
      researchMeta: {
        provider: 'exa',
        search_type: 'auto',
        query_count: queries.length,
        source_count: 0,
        degraded: true,
        degraded_reason: 'no_search_results',
        queries,
      },
    };
  }

  const lines = selected.map((row, index) => {
    const domain = getDomain(row.url);
    return `${index + 1}. ${row.title}（${domain || 'unknown'}）\n   - 摘要：${summarize(row.text)}`;
  });

  const competitorInfo = [
    '以下是基于Exa最新公开网页检索得到的同类市场线索（中国市场优先，仅供内部写作参考）：',
    lines.join('\n\n'),
    '请据此归纳3-5个代表性竞品并完成客观对比，不要在正文展示来源链接或引用编号。',
  ].join('\n\n');

  return {
    competitorInfo,
    sources: selected.map((row) => ({ title: row.title, url: row.url })),
    process,
    researchMeta: {
      provider: 'exa',
      search_type: 'auto',
      query_count: queries.length,
      source_count: selected.length,
      degraded: false,
      queries,
    },
  };
}
