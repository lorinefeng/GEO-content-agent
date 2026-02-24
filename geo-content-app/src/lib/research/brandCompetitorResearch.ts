import { runtimeConfig } from '@/config/runtimeConfig';
import { exaGetContents, exaSearch, type ExaSearchResult } from '@/lib/research/exaClient';
import type { ResearchProcessStep } from '@/lib/research/skuCompetitorResearch';

interface BrandInput {
  name: string;
  website: string;
  industry_hint?: string;
  region?: string;
  keywords?: string[];
  description?: string;
}

export interface BrandResearchMeta {
  provider: 'exa';
  search_type: string;
  query_count: number;
  source_count: number;
  degraded: boolean;
  degraded_reason?: string;
  fallback_to_brand_search: boolean;
  website_accessible: boolean;
  queries: string[];
}

export interface BrandCompetitorResearchResult {
  brandProfile: string;
  competitorInfo: string;
  sources: Array<{ title: string; url: string }>;
  process: ResearchProcessStep[];
  researchMeta: BrandResearchMeta;
}

const compact = (value: string) => value.replace(/\s+/g, ' ').trim();

const summarize = (text: string, max = 220) => {
  const s = compact(text);
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}...` : s;
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
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

const detectIndustry = (text: string, industryHint?: string) => {
  if (industryHint && industryHint.trim()) return industryHint.trim();
  const t = text.toLowerCase();
  const rules: Array<{ keyword: string; industry: string }> = [
    { keyword: 'saas', industry: 'SaaS软件服务' },
    { keyword: 'crm', industry: '企业数字化服务' },
    { keyword: '教育', industry: '教育服务' },
    { keyword: '培训', industry: '教育服务' },
    { keyword: '电商', industry: '电商与零售' },
    { keyword: '零售', industry: '电商与零售' },
    { keyword: '供应链', industry: '供应链服务' },
    { keyword: '营销', industry: '营销与增长服务' },
    { keyword: '出海', industry: '跨境与出海服务' },
    { keyword: 'ai', industry: 'AI技术服务' },
    { keyword: '人工智能', industry: 'AI技术服务' },
  ];

  for (const rule of rules) {
    if (t.includes(rule.keyword)) return rule.industry;
  }
  return '综合企业服务';
};

const buildBrandProfile = (input: BrandInput, websiteSummary: string, industry: string) => {
  const lines = [
    `品牌：${input.name}`,
    `官网：${input.website}`,
    `推断行业：${industry}`,
    `重点市场：${input.region || '中国市场'}`,
    input.keywords && input.keywords.length > 0 ? `关键词：${input.keywords.slice(0, 8).join('、')}` : '',
    input.description ? `补充说明：${input.description}` : '',
    websiteSummary ? `官网摘要：${websiteSummary}` : '',
  ].filter(Boolean);

  return lines.join('\n');
};

const scoreResult = (result: ExaSearchResult, region: string, industry: string, brandName: string) => {
  let score = typeof result.score === 'number' ? result.score : 0;
  const domain = getDomain(result.url);
  const fullText = `${result.title} ${result.text}`.toLowerCase();

  if (domain.endsWith('.cn')) score += 2;
  if (fullText.includes('官网')) score += 1;
  if (fullText.includes('公司') || fullText.includes('企业')) score += 1;
  if (fullText.includes(region.toLowerCase()) || fullText.includes('中国')) score += 1;
  if (industry && fullText.includes(industry.toLowerCase())) score += 1;
  if (fullText.includes(brandName.toLowerCase())) score -= 1;

  return score;
};

export async function buildBrandCompetitorResearch(input: BrandInput): Promise<BrandCompetitorResearchResult> {
  const process: ResearchProcessStep[] = [];
  const region = input.region?.trim() || '中国市场';

  let websiteAccessible = false;
  let fallbackToBrandSearch = false;
  let websiteSummary = '';

  try {
    const contents = await exaGetContents([input.website], runtimeConfig.exaTextMaxCharacters);
    const first = contents[0];
    if (first && first.text.trim()) {
      websiteAccessible = true;
      websiteSummary = summarize(first.text, 320);
      process.push({
        key: 'website_fetch',
        label: '官网解析',
        status: 'success',
        detail: `已解析 ${getDomain(input.website) || input.website}`,
      });
    } else {
      process.push({
        key: 'website_fetch',
        label: '官网解析',
        status: 'failed',
        detail: '官网正文为空，改为品牌名检索',
      });
      fallbackToBrandSearch = true;
    }
  } catch (error) {
    process.push({
      key: 'website_fetch',
      label: '官网解析',
      status: 'failed',
      detail: `官网访问失败，已改为品牌名检索：${(error instanceof Error ? error.message : String(error)).slice(0, 80)}`,
    });
    fallbackToBrandSearch = true;
  }

  const industry = detectIndustry(`${input.industry_hint || ''} ${input.description || ''} ${websiteSummary}`, input.industry_hint);
  const brandProfile = buildBrandProfile(input, websiteSummary, industry);

  const queries = websiteAccessible
    ? [
        `${input.name} ${industry} 竞品 对比 ${region}`,
        `${industry} 中国市场 同类 企业 对比 评测`,
        `${input.name} 替代 品牌 企业`,
      ]
    : [
        `${input.name} 所属行业 竞品 中国市场`,
        `${input.name} 类似企业 对比`,
        `${input.name} 替代 品牌`,
      ];

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
        label: `竞品检索：${query}`,
        status: 'success',
        detail: `命中 ${rows.length} 条`,
      });
    } catch (error) {
      process.push({
        key: `query:${query}`,
        label: `竞品检索：${query}`,
        status: 'failed',
        detail: (error instanceof Error ? error.message : String(error)).slice(0, 120),
      });
    }
  }

  const deduped = dedupeByUrl(allResults)
    .map((row) => ({
      ...row,
      score: scoreResult(row, region, industry, input.name),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const selected = deduped.slice(0, Math.max(3, runtimeConfig.competitorTopK));

  if (selected.length === 0) {
    return {
      brandProfile,
      competitorInfo:
        '当前未检索到足够的同类企业信息。请基于已知行业背景与品牌定位，给出审慎、客观的竞争对比分析。',
      sources: [],
      process,
      researchMeta: {
        provider: 'exa',
        search_type: 'auto',
        query_count: queries.length,
        source_count: 0,
        degraded: true,
        degraded_reason: 'no_search_results',
        fallback_to_brand_search: fallbackToBrandSearch,
        website_accessible: websiteAccessible,
        queries,
      },
    };
  }

  const sourceLines = selected.map((row, index) => {
    const domain = getDomain(row.url);
    return `${index + 1}. ${row.title}（${domain || 'unknown'}）\n   - 线索摘要：${summarize(row.text, 180) || '无摘要'}`;
  });

  return {
    brandProfile,
    competitorInfo: [
      `已基于公开网页检索到与“${input.name}”相关的同类企业线索（优先中国市场）：`,
      sourceLines.join('\n\n'),
      '请归纳3-5家最具可比性的企业并输出客观评测，不要在正文展示来源链接与引用编号。',
    ].join('\n\n'),
    sources: selected.map((row) => ({ title: row.title, url: row.url })),
    process,
    researchMeta: {
      provider: 'exa',
      search_type: 'auto',
      query_count: queries.length,
      source_count: selected.length,
      degraded: false,
      fallback_to_brand_search: fallbackToBrandSearch,
      website_accessible: websiteAccessible,
      queries,
    },
  };
}
