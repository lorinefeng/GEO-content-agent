import OpenAI from 'openai';
import type { D1Database } from '@cloudflare/workers-types';
import { getCloudflareEnv } from '@/lib/cloudflare';

export type KeywordBucket = 'category' | 'feature' | 'price' | 'persona' | 'brand';
export type QuestionGranularity = 'coarse' | 'medium' | 'fine';
export type QuestionPackageStatus = 'generated' | 'fallback' | 'edited';

export type QuestionKeyword = {
  keyword: string;
  bucket: KeywordBucket;
};

export type QuestionItem = {
  id: string;
  question: string;
  intent: string;
  expected_signal: string;
};

export type QuestionPackagePayload = {
  version: 'sku-question-package-v1';
  mode: 'sku';
  article_id: string;
  product_id: string;
  product_name: string;
  strategy: string;
  strategy_name: string;
  keywords: QuestionKeyword[];
  questions: Record<QuestionGranularity, QuestionItem[]>;
  generated_at: string;
  updated_at: string;
};

export type QuestionPackageInput = {
  articleId: string;
  productId: string;
  productName: string;
  strategy: string;
  strategyName: string;
  productPrice: number;
  productPayload?: string | null;
  sourceJsonRaw?: string | null;
  content: string;
};

const BUCKET_ALIASES: Record<string, KeywordBucket> = {
  category: 'category',
  cate: 'category',
  product: 'category',
  category_term: 'category',
  feature: 'feature',
  feature_term: 'feature',
  selling_point: 'feature',
  price: 'price',
  price_term: 'price',
  price_band: 'price',
  persona: 'persona',
  user: 'persona',
  user_persona: 'persona',
  audience: 'persona',
  brand: 'brand',
  brand_term: 'brand',
};

const QUESTION_LIMITS: Record<QuestionGranularity, { min: number; max: number }> = {
  coarse: { min: 2, max: 3 },
  medium: { min: 4, max: 5 },
  fine: { min: 2, max: 3 },
};

type ParsedSourceContext = {
  category: string;
  categoryTerms: string[];
  material: string;
  color: string;
  description: string;
  tags: string[];
  season: string;
  personaHint: string;
  sceneHint: string;
  brandHint: string;
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const compactText = (value: string) => value.replace(/\s+/g, '').trim();

const CATEGORY_SPLITTER = /[,\n\r\t|/，、;；]+/;

const FEATURE_PATTERNS = [
  '高领',
  '圆领',
  'V领',
  '立领',
  '翻领',
  '无袖',
  '短袖',
  '长袖',
  '修身',
  '宽松',
  '显瘦',
  '直筒',
  '阔腿',
  '高腰',
  '针织',
  '牛仔',
  '纯棉',
  '轻薄',
  '透气',
  '保暖',
] as const;

const GENERIC_TERMS = new Set([
  '商品',
  '服装',
  '成衣',
  '新品',
  '新款',
  '女装',
  '男装',
  '女士',
  '男士',
  '儿童',
  '童装',
  '配饰',
  '上装',
]);

const normalizeKeywordText = (value: string) =>
  normalizeWhitespace(value)
    .replace(/\$[A-Za-z0-9_-]+/g, '')
    .replace(/[|]/g, ' ')
    .trim();

const isGenericTerm = (value: string) => GENERIC_TERMS.has(value);

const splitSourceTerms = (value: string) =>
  value
    .split(CATEGORY_SPLITTER)
    .map((item) => normalizeKeywordText(item))
    .filter((item) => item.length >= 2 && item.length <= 20 && !/^https?:\/\//i.test(item));

const truncateForPrompt = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n...[truncated]`;
};

const safeJsonParse = (raw: string) => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const extractJsonObject = (raw: string) => {
  const trimmed = raw.trim();
  const direct = safeJsonParse(trimmed);
  if (direct && typeof direct === 'object') return direct;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fencedMatch?.[1]) {
    const parsed = safeJsonParse(fencedMatch[1].trim());
    if (parsed && typeof parsed === 'object') return parsed;
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const parsed = safeJsonParse(trimmed.slice(first, last + 1));
    if (parsed && typeof parsed === 'object') return parsed;
  }

  return null;
};

const normalizeBucket = (value: unknown): KeywordBucket | null => {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  return BUCKET_ALIASES[key] ?? null;
};

const buildPriceBand = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) {
    return { rangeLabel: '主流价位', rangeQuery: '主流价位', exact: '' };
  }
  if (price < 100) {
    return { rangeLabel: '百元内', rangeQuery: '100元以内', exact: `${price}元` };
  }
  if (price < 300) {
    return { rangeLabel: '入门价位', rangeQuery: '100到300元', exact: `${price}元` };
  }
  if (price < 600) {
    return { rangeLabel: '中端价位', rangeQuery: '300到600元', exact: `${price}元` };
  }
  if (price < 1000) {
    return { rangeLabel: '中高价位', rangeQuery: '600到1000元', exact: `${price}元` };
  }
  return { rangeLabel: '高价位', rangeQuery: '1000元以上', exact: `${price}元` };
};

const detectSeason = (text: string) => {
  const joined = compactText(text);
  if (!joined) return '当季';
  if (joined.includes('早秋')) return '早秋';
  if (joined.includes('初秋')) return '初秋';
  if (joined.includes('春')) return '春季';
  if (joined.includes('夏')) return '夏季';
  if (joined.includes('秋')) return '秋季';
  if (joined.includes('冬')) return '冬季';
  return '当季';
};

const detectPersonaHint = (text: string, tags: string[]) => {
  const joined = `${text} ${tags.join(' ')}`;
  if (/通勤|上班|职场|商务/.test(joined)) return '通勤人群';
  if (/学生|校园/.test(joined)) return '学生人群';
  if (/户外|机能|运动/.test(joined)) return '运动与户外人群';
  if (/约会|出街|潮流/.test(joined)) return '日常出街人群';
  return '注重性价比与日常穿搭的人群';
};

const detectSceneHint = (text: string, tags: string[]) => {
  const joined = `${text} ${tags.join(' ')}`;
  if (/通勤|上班|职场|商务/.test(joined)) return '通勤穿搭';
  if (/学生|校园/.test(joined)) return '校园穿搭';
  if (/户外|机能|运动/.test(joined)) return '运动穿搭';
  if (/约会|出街|潮流/.test(joined)) return '日常穿搭';
  return '';
};

const detectBrandHint = (productName: string) => {
  const trimmed = productName.trim();
  if (!trimmed) return '';
  const englishToken = trimmed.match(/[A-Za-z][A-Za-z0-9&.\-]*/)?.[0];
  if (englishToken) return englishToken.toUpperCase();
  const cnToken = trimmed.match(/^[\u4e00-\u9fa5A-Za-z0-9]{2,8}/)?.[0] ?? '';
  return cnToken;
};

const parseSourceContext = (input: QuestionPackageInput): ParsedSourceContext => {
  const rawJson = input.sourceJsonRaw?.trim() || input.productPayload?.trim() || '';
  const parsedValue = rawJson ? safeJsonParse(rawJson) : null;
  const parsed = parsedValue && typeof parsedValue === 'object' ? (parsedValue as Record<string, unknown>) : null;

  const tags = Array.isArray(parsed?.tags)
    ? parsed?.tags
        .filter((item): item is string => typeof item === 'string')
        .flatMap((item) => splitSourceTerms(item))
        .filter(Boolean)
    : [];
  const description =
    typeof parsed?.description === 'string'
      ? parsed.description
      : typeof parsed?.desc === 'string'
        ? parsed.desc
        : '';
  const categoryRaw =
    typeof parsed?.category === 'string'
      ? parsed.category
      : typeof parsed?.mainCategory === 'string'
        ? parsed.mainCategory
        : '';
  const categoryTerms = splitSourceTerms(categoryRaw);
  const category = categoryTerms[0] || '商品';
  const material = typeof parsed?.material === 'string' ? parsed.material.trim() : '';
  const color = typeof parsed?.color === 'string' ? parsed.color.trim() : '';
  const sourceOnlyText = `${input.productName} ${description} ${rawJson} ${tags.join(' ')}`.trim();

  return {
    category: category || '商品',
    categoryTerms,
    material,
    color,
    description,
    tags,
    season: detectSeason(sourceOnlyText),
    personaHint: detectPersonaHint(sourceOnlyText, tags),
    sceneHint: detectSceneHint(sourceOnlyText, tags),
    brandHint: detectBrandHint(input.productName),
  };
};

const uniquePush = <T,>(items: T[], value: T, getKey: (entry: T) => string) => {
  const key = getKey(value);
  if (items.some((entry) => getKey(entry) === key)) return;
  items.push(value);
};

const pickPrimaryCategory = (productName: string, context: ParsedSourceContext) => {
  const product = compactText(productName);
  const scored = context.categoryTerms
    .map((term) => {
      const compact = compactText(term);
      let score = term.length;
      if (product.includes(compact)) score += 10;
      if (!isGenericTerm(term)) score += 5;
      if (term.length > 8) score -= 2;
      return { term, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.term || context.category || '商品';
};

const buildFeatureKeywords = (productName: string, primaryCategory: string, context: ParsedSourceContext) => {
  const source = `${productName} ${context.description} ${context.tags.join(' ')}`;
  const features: string[] = [];
  for (const pattern of FEATURE_PATTERNS) {
    if (!source.includes(pattern)) continue;
    const combined =
      primaryCategory && !isGenericTerm(primaryCategory)
        ? `${pattern}${primaryCategory}`
        : pattern;
    uniquePush(features, normalizeKeywordText(combined), (entry) => entry);
    if (features.length >= 2) break;
  }
  return features;
};

export const buildCanonicalQuestionKeywords = (input: QuestionPackageInput): QuestionKeyword[] => {
  const context = parseSourceContext(input);
  const keywords: QuestionKeyword[] = [];
  const primaryCategory = pickPrimaryCategory(input.productName, context);
  const featureKeywords = buildFeatureKeywords(input.productName, primaryCategory, context);

  uniquePush(
    keywords,
    { keyword: normalizeKeywordText(input.productName), bucket: 'category' },
    (entry) => entry.keyword.toLowerCase()
  );

  if (context.brandHint) {
    uniquePush(keywords, { keyword: context.brandHint, bucket: 'brand' }, (entry) => entry.keyword.toLowerCase());
  }

  if (Number.isFinite(input.productPrice) && input.productPrice > 0) {
    uniquePush(keywords, { keyword: `${input.productPrice}元`, bucket: 'price' }, (entry) => entry.keyword.toLowerCase());
  }

  for (const feature of featureKeywords) {
    uniquePush(keywords, { keyword: feature, bucket: 'feature' }, (entry) => entry.keyword.toLowerCase());
  }

  if (context.sceneHint) {
    uniquePush(keywords, { keyword: context.sceneHint, bucket: 'persona' }, (entry) => entry.keyword.toLowerCase());
  } else if (context.season !== '当季' && primaryCategory && !isGenericTerm(primaryCategory)) {
    uniquePush(
      keywords,
      { keyword: `${context.season}${primaryCategory}`, bucket: 'category' },
      (entry) => entry.keyword.toLowerCase()
    );
  }

  if (primaryCategory && !isGenericTerm(primaryCategory)) {
    uniquePush(keywords, { keyword: primaryCategory, bucket: 'category' }, (entry) => entry.keyword.toLowerCase());
  }

  const cleanKeywords = keywords
    .map((entry) => ({ ...entry, keyword: normalizeKeywordText(entry.keyword) }))
    .filter((entry) => entry.keyword.length >= 2 && entry.keyword.length <= 20);

  return cleanKeywords.slice(0, 6);
};

const buildFallbackKeywords = (input: QuestionPackageInput): QuestionKeyword[] => buildCanonicalQuestionKeywords(input);

const buildFallbackQuestions = (input: QuestionPackageInput, context: ParsedSourceContext) => {
  const priceBand = buildPriceBand(input.productPrice);
  const seasonCategory = `${context.season}${context.category}`.trim();
  const featureLabel = context.material || context.color || context.tags[0] || context.category;
  const brandPart = context.brandHint ? `${context.brandHint}` : '这款';

  return {
    coarse: [
      {
        id: 'coarse_1',
        question: `${seasonCategory}有什么新品好物值得关注？`,
        intent: '观察 AI 在品类层面的新品召回能力',
        expected_signal: '回答可能同时覆盖目标商品与同类竞品',
      },
      {
        id: 'coarse_2',
        question: `${context.season}有哪些${priceBand.rangeQuery}的${context.category}值得买？`,
        intent: '观察 AI 在价格带层面的候选收敛情况',
        expected_signal: '回答应更集中于同价位同品类商品',
      },
    ],
    medium: [
      {
        id: 'medium_1',
        question: `有哪些适合${context.personaHint}、价格在${priceBand.rangeQuery}的${context.category}推荐？`,
        intent: '结合用户画像与价格区间测试检索命中情况',
        expected_signal: '回答应缩小到更接近目标商品的人群与价位带',
      },
      {
        id: 'medium_2',
        question: `${context.season}适合日常穿搭的${featureLabel}${context.category}有哪些值得关注的款式？`,
        intent: '结合场景与卖点测试内容识别能力',
        expected_signal: '回答应出现更具体的商品特点与款式信息',
      },
      {
        id: 'medium_3',
        question: `${priceBand.rangeQuery}里有哪些口碑不错的${context.category}适合${context.personaHint}？`,
        intent: '测试 AI 是否能把价格与人群同时映射到目标商品',
        expected_signal: '回答中可能出现目标商品或高度相似候选',
      },
      {
        id: 'medium_4',
        question: `${context.season}新款${context.category}里，有哪些兼顾性价比和穿搭实用性的选择？`,
        intent: '测试 AI 在综合购买意图下的召回表现',
        expected_signal: '回答应体现“新品”“性价比”“实用性”等多维信号',
      },
    ],
    fine: [
      {
        id: 'fine_1',
        question: `${brandPart}一款售价${priceBand.exact || priceBand.rangeQuery}的${seasonCategory}怎么样？`,
        intent: '利用品牌与价格事实测试具体商品可识别性',
        expected_signal: '若互联网已有信息，回答更可能收敛到目标商品',
      },
      {
        id: 'fine_2',
        question: `一款${context.season}上新的${priceBand.exact || priceBand.rangeQuery}${featureLabel}${context.category}值得买吗？`,
        intent: '利用上架时段、价格与卖点组合测试精细命中情况',
        expected_signal: '发布前若信息稀少，回答可能泛化；发布后应更聚焦',
      },
    ],
  };
};

const buildFallbackPayload = (input: QuestionPackageInput, fixedKeywords?: QuestionKeyword[] | null): QuestionPackagePayload => {
  const now = new Date().toISOString();
  const context = parseSourceContext(input);
  const keywords =
    fixedKeywords && fixedKeywords.length > 0
      ? fixedKeywords.map((entry) => ({ ...entry, keyword: normalizeKeywordText(entry.keyword) })).filter((entry) => entry.keyword)
      : buildFallbackKeywords(input);
  const questions = buildFallbackQuestions(input, context);

  return {
    version: 'sku-question-package-v1',
    mode: 'sku',
    article_id: input.articleId,
    product_id: input.productId,
    product_name: input.productName,
    strategy: input.strategy,
    strategy_name: input.strategyName,
    keywords: keywords.slice(0, 8),
    questions,
    generated_at: now,
    updated_at: now,
  };
};

export const normalizeQuestionKeywords = (rawKeywords: unknown, fallbackKeywords: QuestionKeyword[]): QuestionKeyword[] => {
  const normalizedKeywords: QuestionKeyword[] = [];
  const sourceItems = Array.isArray(rawKeywords) ? rawKeywords : [];

  for (const item of sourceItems) {
    if (typeof item === 'string') {
      const keyword = normalizeKeywordText(item);
      if (!keyword) continue;
      uniquePush(normalizedKeywords, { keyword, bucket: 'category' }, (entry) => entry.keyword.toLowerCase());
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const keywordRow = item as Record<string, unknown>;
    const keyword =
      typeof keywordRow.keyword === 'string'
        ? normalizeKeywordText(keywordRow.keyword)
        : typeof keywordRow.value === 'string'
          ? normalizeKeywordText(keywordRow.value)
          : '';
    const bucket = normalizeBucket(keywordRow.bucket) ?? 'category';
    if (!keyword) continue;
    uniquePush(normalizedKeywords, { keyword, bucket }, (entry) => entry.keyword.toLowerCase());
    if (normalizedKeywords.length >= 8) break;
  }

  for (const keyword of fallbackKeywords) {
    if (normalizedKeywords.length >= 8) break;
    uniquePush(
      normalizedKeywords,
      { keyword: normalizeKeywordText(keyword.keyword), bucket: keyword.bucket },
      (entry) => entry.keyword.toLowerCase()
    );
  }

  const trimmedKeywords = normalizedKeywords.slice(0, 8);
  while (trimmedKeywords.length < 5 && fallbackKeywords[trimmedKeywords.length]) {
    uniquePush(
      trimmedKeywords,
      {
        keyword: normalizeKeywordText(fallbackKeywords[trimmedKeywords.length].keyword),
        bucket: fallbackKeywords[trimmedKeywords.length].bucket,
      },
      (entry) => entry.keyword.toLowerCase()
    );
  }

  return trimmedKeywords;
};

const normalizeQuestionItem = (
  raw: unknown,
  granularity: QuestionGranularity,
  index: number,
  fallback: QuestionItem
): QuestionItem => {
  if (typeof raw === 'string') {
    const question = normalizeWhitespace(raw);
    return {
      id: `${granularity}_${index + 1}`,
      question: question || fallback.question,
      intent: fallback.intent,
      expected_signal: fallback.expected_signal,
    };
  }
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, id: `${granularity}_${index + 1}` };
  }
  const row = raw as Record<string, unknown>;
  const question =
    typeof row.question === 'string'
      ? normalizeWhitespace(row.question)
      : typeof row.query === 'string'
        ? normalizeWhitespace(row.query)
        : fallback.question;
  const intent =
    typeof row.intent === 'string' ? normalizeWhitespace(row.intent) : fallback.intent;
  const expectedSignal =
    typeof row.expected_signal === 'string'
      ? normalizeWhitespace(row.expected_signal)
      : typeof row.expectedSignal === 'string'
        ? normalizeWhitespace(row.expectedSignal)
        : fallback.expected_signal;

  return {
    id: `${granularity}_${index + 1}`,
    question: question || fallback.question,
    intent: intent || fallback.intent,
    expected_signal: expectedSignal || fallback.expected_signal,
  };
};

export const normalizeQuestionPackagePayload = (
  raw: unknown,
  input: QuestionPackageInput,
  options?: { preserveGeneratedAt?: string | null; fixedKeywords?: QuestionKeyword[] | null }
): QuestionPackagePayload => {
  const fallback = buildFallbackPayload(input, options?.fixedKeywords);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const row = raw as Record<string, unknown>;
  const fixedKeywords =
    options?.fixedKeywords && options.fixedKeywords.length > 0
      ? normalizeQuestionKeywords(options.fixedKeywords, fallback.keywords)
      : null;
  const trimmedKeywords = fixedKeywords ?? normalizeQuestionKeywords(row.keywords, fallback.keywords);

  const rawQuestions =
    row.questions && typeof row.questions === 'object' ? (row.questions as Record<string, unknown>) : {};
  const questions = {} as Record<QuestionGranularity, QuestionItem[]>;

  for (const granularity of ['coarse', 'medium', 'fine'] as QuestionGranularity[]) {
    const sourceItems = Array.isArray(rawQuestions[granularity]) ? rawQuestions[granularity] : [];
    const fallbackItems = fallback.questions[granularity];
    const normalizedItems = sourceItems
      .slice(0, QUESTION_LIMITS[granularity].max)
      .map((item, index) => normalizeQuestionItem(item, granularity, index, fallbackItems[index] ?? fallbackItems[0]))
      .filter((item) => Boolean(item.question));

    const filled = [...normalizedItems];
    while (filled.length < QUESTION_LIMITS[granularity].min && fallbackItems[filled.length]) {
      filled.push({ ...fallbackItems[filled.length], id: `${granularity}_${filled.length + 1}` });
    }
    questions[granularity] = filled.slice(0, QUESTION_LIMITS[granularity].max);
  }

  const now = new Date().toISOString();

  return {
    version: 'sku-question-package-v1',
    mode: 'sku',
    article_id: input.articleId,
    product_id: input.productId,
    product_name: input.productName,
    strategy: input.strategy,
    strategy_name: input.strategyName,
    keywords: trimmedKeywords,
    questions,
    generated_at:
      typeof row.generated_at === 'string' && row.generated_at
        ? row.generated_at
        : options?.preserveGeneratedAt || fallback.generated_at,
    updated_at: now,
  };
};

const buildPrompt = (input: QuestionPackageInput, fixedKeywords: QuestionKeyword[]) => {
  const context = parseSourceContext(input);
  const priceBand = buildPriceBand(input.productPrice);
  const rawSource = truncateForPrompt(input.sourceJsonRaw?.trim() || input.productPayload?.trim() || '{}', 12000);
  const articleContent = truncateForPrompt(input.content, 16000);

  return `你是一个问题设计 Agent，负责为 GEO 检测生成严格的 JSON 问题包。

你的任务对象是一篇已经生成完成的 SKU 文章。请根据以下信息输出一份问题包。

必须遵守：
1. 只输出一个 JSON 对象，不要输出 Markdown、解释、注释或代码块。
2. keywords 已经预先确定，必须原样使用，不要新增、删减、改写或重排。
3. keywords 中每项都必须包含 keyword 和 bucket。
4. bucket 只能是 category / feature / price / persona / brand。
5. coarse 问题输出 2 到 3 个。
6. medium 问题输出 4 到 5 个。
7. fine 问题输出 2 到 3 个。
8. coarse 和 medium 默认不要直接写完整商品名。
9. fine 允许出现品牌名、价格、上架时间、品类等更具体事实。
10. 问题必须像真实用户会问的话，不能出现“请检测”“请评估命中率”等内部口吻。
11. 问题集合必须覆盖：品类发现、价格带筛选、用户画像/场景匹配、具体商品识别。

输出 JSON schema：
{
  "version": "sku-question-package-v1",
  "mode": "sku",
  "article_id": "${input.articleId}",
  "product_id": "${input.productId}",
  "product_name": "${input.productName}",
  "strategy": "${input.strategy}",
  "strategy_name": "${input.strategyName}",
  "keywords": ${JSON.stringify(fixedKeywords, null, 2)},
  "questions": {
    "coarse": [
      {
        "id": "coarse_1",
        "question": "示例问题",
        "intent": "为什么设计这个问题",
        "expected_signal": "预期 AI 会出现什么表现"
      }
    ],
    "medium": [],
    "fine": []
  }
}

SKU 归一化信息：
- 商品名：${input.productName}
- 策略：${input.strategyName}
- 价格：${Number.isFinite(input.productPrice) ? `¥${input.productPrice}` : '未知'}
- 价格带：${priceBand.rangeQuery}
- 品类：${context.category}
- 材质：${context.material || '未提供'}
- 颜色：${context.color || '未提供'}
- 季节：${context.season}
- 用户画像提示：${context.personaHint}
- 品牌提示：${context.brandHint || '未识别'}
- 标签：${context.tags.join(', ') || '未提供'}

原始 SKU 输入 JSON：
${rawSource}

文章正文：
${articleContent}
`;
};

export const generateQuestionPackagePayload = async (
  input: QuestionPackageInput,
  options?: { fixedKeywords?: QuestionKeyword[] | null }
) => {
  const env = getCloudflareEnv();
  const apiKey = env.OPENAI_API_KEY;
  const baseURL = env.OPENAI_BASE_URL;
  const model =
    typeof env.OPENAI_MODEL === 'string' && env.OPENAI_MODEL ? env.OPENAI_MODEL : 'gemini-3-flash-preview';
  const fixedKeywords =
    options?.fixedKeywords && options.fixedKeywords.length > 0
      ? normalizeQuestionKeywords(options.fixedKeywords, buildCanonicalQuestionKeywords(input))
      : buildCanonicalQuestionKeywords(input);

  if (!apiKey) {
    const fallback = buildFallbackPayload(input, fixedKeywords);
    return { payload: fallback, status: 'fallback' as QuestionPackageStatus, errorMessage: '缺少 OPENAI_API_KEY' };
  }

  const openai = new OpenAI({ apiKey, baseURL });
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个严格输出 JSON 的问题设计 Agent。',
        },
        {
          role: 'user',
          content: buildPrompt(input, fixedKeywords),
        },
      ],
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content || '';
    const parsed = extractJsonObject(raw);
    if (!parsed) {
      throw new Error('模型未返回合法 JSON');
    }

    return {
      payload: normalizeQuestionPackagePayload(parsed, input, { fixedKeywords }),
      status: 'generated' as QuestionPackageStatus,
      errorMessage: null,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const fallback = buildFallbackPayload(input, fixedKeywords);
    return {
      payload: fallback,
      status: 'fallback' as QuestionPackageStatus,
      errorMessage: detail.slice(0, 500),
    };
  }
};

export const upsertQuestionPackage = async (
  db: D1Database,
  input: QuestionPackageInput,
  payload: QuestionPackagePayload,
  status: QuestionPackageStatus,
  errorMessage?: string | null
) => {
  const rowId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO QuestionPackage (
        id, article_id, mode, product_id, product_name,
        strategy, strategy_name, status, error_message, package_json,
        created_at, updated_at
      ) VALUES (?, ?, 'sku', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(article_id) DO UPDATE SET
        product_id = excluded.product_id,
        product_name = excluded.product_name,
        strategy = excluded.strategy,
        strategy_name = excluded.strategy_name,
        status = excluded.status,
        error_message = excluded.error_message,
        package_json = excluded.package_json,
        updated_at = datetime('now')`
    )
    .bind(
      rowId,
      input.articleId,
      input.productId,
      input.productName,
      input.strategy,
      input.strategyName,
      status,
      errorMessage || null,
      JSON.stringify(payload, null, 2)
    )
    .run();
};
