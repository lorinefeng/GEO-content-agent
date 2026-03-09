'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Row,
    Col,
    Typography,
    Tabs,
    Empty,
    Spin,
    message,
    Alert,
    Upload,
    Button,
    Space,
    Progress,
    List,
    Tag,
} from 'antd';
import ProductForm, { ProductInfo } from '@/components/ProductForm';
import BrandIpForm, { BrandInfo } from '@/components/BrandIpForm';
import StrategySelector, { ContentMode } from '@/components/StrategySelector';
import MarkdownPreview from '@/components/MarkdownPreview';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Paragraph, Text } = Typography;

interface ArticleResult {
    mode?: ContentMode;
    strategy: string;
    strategy_name: string;
    content: string;
}

interface ResearchProcessStep {
    key: string;
    label: string;
    status: 'success' | 'failed' | 'skipped';
    detail?: string;
}

interface ReferenceImagePayload {
    public_url: string;
    source_type: 'upload' | 'url';
    origin_name?: string;
    mime_type?: string;
    r2_key?: string;
}

type BatchProgress = {
    total: number;
    done: number;
    success: number;
    failed: number;
};

const API_BASE = '/api';

const normalizeImageUrlArray = (raw: unknown, limit: number): string[] => {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
        if (typeof item !== 'string') continue;
        const url = item.trim();
        if (!/^https?:\/\//i.test(url)) continue;
        out.push(url);
        if (out.length >= limit) break;
    }
    return out;
};

const parseProductsJson = (raw: unknown): ProductInfo[] => {
    if (!Array.isArray(raw)) return [];
    const out: ProductInfo[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const name = typeof r.name === 'string' ? r.name : typeof r.productName === 'string' ? r.productName : '';
        const priceRaw = r.price;
        const price =
            typeof priceRaw === 'number'
                ? priceRaw
                : typeof priceRaw === 'string'
                  ? parseFloat(priceRaw)
                  : NaN;
        if (!name || !Number.isFinite(price)) continue;
        const imageUrlRaw = Array.isArray(r.image_urls)
            ? r.image_urls
            : Array.isArray(r.imageUrls)
              ? r.imageUrls
              : typeof r.image_urls === 'string'
                ? r.image_urls.split(',')
                : typeof r.imageUrls === 'string'
                  ? r.imageUrls.split(',')
                  : [];
        const product: ProductInfo = {
            name,
            price,
            material: typeof r.material === 'string' ? r.material : undefined,
            color: typeof r.color === 'string' ? r.color : undefined,
            description: typeof r.description === 'string' ? r.description : undefined,
            category:
                typeof r.category === 'string'
                    ? r.category
                    : typeof r.mainCategory === 'string'
                      ? r.mainCategory
                      : undefined,
            tags: Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === 'string') : undefined,
            image_urls: normalizeImageUrlArray(imageUrlRaw, 2),
            source_json_raw: JSON.stringify(item, null, 2),
        };
        out.push(product);
    }
    return out;
};

const runPool = async <T,>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) => {
    let idx = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (idx < items.length) {
            const current = idx;
            idx += 1;
            if (current >= items.length) break;
            await worker(items[current]);
        }
    });
    await Promise.all(runners);
};

export default function GeneratePage() {
    const { loading: authLoading } = useRequireAuth();
    const [contentMode, setContentMode] = useState<ContentMode>('sku');
    const [generateMode, setGenerateMode] = useState<'single' | 'batch'>('single');
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
    const [singleLoading, setSingleLoading] = useState(false);
    const [articles, setArticles] = useState<ArticleResult[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [processSteps, setProcessSteps] = useState<ResearchProcessStep[]>([]);
    const [researchMeta, setResearchMeta] = useState<Record<string, unknown> | null>(null);

    const [batchProducts, setBatchProducts] = useState<ProductInfo[]>([]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchProgress, setBatchProgress] = useState<BatchProgress>({ total: 0, done: 0, success: 0, failed: 0 });
    const [batchErrors, setBatchErrors] = useState<string[]>([]);
    const batchCancelRef = useRef(false);

    const effectiveLoading = singleLoading || batchLoading;

    const batchPercent = useMemo(() => {
        if (!batchProgress.total) return 0;
        return Math.round((batchProgress.done / batchProgress.total) * 100);
    }, [batchProgress.done, batchProgress.total]);

    useEffect(() => {
        setSelectedStrategies([]);
        setProcessSteps([]);
        setResearchMeta(null);
    }, [contentMode]);

    useEffect(() => {
        if (contentMode === 'brand_ip' && generateMode === 'batch') {
            setGenerateMode('single');
        }
    }, [contentMode, generateMode]);

    if (authLoading) {
        return (
            <div style={{ padding: 80, textAlign: 'center' }}>
                <Spin size="large" />
                <Paragraph style={{ color: 'var(--text-secondary)', marginTop: 16 }}>正在校验登录状态...</Paragraph>
            </div>
        );
    }

    const uploadReferenceImages = async (mode: ContentMode, imageFiles: File[]): Promise<ReferenceImagePayload[]> => {
        if (imageFiles.length === 0) return [];
        if (imageFiles.length > 5) {
            message.error('单次最多上传5张图片');
            return [];
        }
        const formData = new FormData();
        formData.append('mode', mode);
        for (const file of imageFiles.slice(0, 5)) {
            formData.append('files', file);
        }
        const response = await axios.post(`${API_BASE}/uploads/reference-images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return Array.isArray(response.data?.images) ? (response.data.images as ReferenceImagePayload[]) : [];
    };

    const saveGeneratedArticles = async (
        mode: ContentMode,
        subjectId: string,
        subjectName: string,
        subjectPayload: unknown,
        generatedArticles: ArticleResult[],
        productPrice = 0,
        researchSnapshotId?: string,
        referenceImages: ReferenceImagePayload[] = [],
        sourceJsonRaw?: string
    ) => {
        const payload = JSON.stringify(subjectPayload);
        const saveResults = await Promise.allSettled(
            generatedArticles.map((article) =>
                axios.post(`${API_BASE}/articles`, {
                    mode,
                    subject_id: subjectId,
                    subject_name: subjectName,
                    subject_payload: payload,
                    product_name: subjectName,
                    product_price: productPrice,
                    product_id: subjectId,
                    product_payload: payload,
                    strategy: article.strategy,
                    strategy_name: article.strategy_name,
                    content: article.content,
                    research_snapshot_id: researchSnapshotId,
                    reference_images: referenceImages,
                    source_json_raw: sourceJsonRaw,
                })
            )
        );

        const failedCount = saveResults.filter((r) => r.status === 'rejected').length;
        const questionFallbackCount = saveResults.filter(
            (r) =>
                r.status === 'fulfilled' &&
                (r.value.data?.question_package_status === 'fallback' || r.value.data?.question_package_status === 'failed')
        ).length;
        if (failedCount > 0) {
            message.warning(`内容已生成，但有 ${failedCount} 篇保存历史失败`);
        }
        if (questionFallbackCount > 0) {
            message.warning(`有 ${questionFallbackCount} 篇文章的问题包使用了降级生成，可在“问题设计”页继续编辑`);
        }
    };

    const handleGenerateSku = async (product: ProductInfo, imageFiles: File[]) => {
        if (selectedStrategies.length === 0) {
            message.warning('请至少选择一种生成策略');
            return;
        }

        setSingleLoading(true);
        setArticles([]);
        setErrors([]);
        setProcessSteps([]);
        setResearchMeta(null);

        try {
            const subjectId = crypto.randomUUID();
            const uploadedImages = await uploadReferenceImages('sku', imageFiles);
            const response = await axios.post(`${API_BASE}/generate`, {
                mode: 'sku',
                subject_id: subjectId,
                product,
                strategies: selectedStrategies,
                reference_images: uploadedImages,
            });

            const generatedArticles: ArticleResult[] = Array.isArray(response.data.articles) ? response.data.articles : [];
            const generateErrors: string[] = Array.isArray(response.data.errors) ? response.data.errors : [];
            const nextProcess: ResearchProcessStep[] = Array.isArray(response.data.process) ? response.data.process : [];
            const nextResearchMeta =
                response.data.research_meta && typeof response.data.research_meta === 'object'
                    ? (response.data.research_meta as Record<string, unknown>)
                    : null;
            setProcessSteps(nextProcess);
            setResearchMeta(nextResearchMeta);

            if (generatedArticles.length > 0) {
                setArticles(generatedArticles);
                message.success(`成功生成 ${generatedArticles.length} 篇内容`);
                const researchSnapshotId =
                    typeof response.data.research_snapshot_id === 'string' ? response.data.research_snapshot_id : undefined;
                await saveGeneratedArticles(
                    'sku',
                    subjectId,
                    product.name,
                    product,
                    generatedArticles,
                    product.price,
                    researchSnapshotId,
                    uploadedImages,
                    product.source_json_raw
                );
            }

            if (generateErrors.length > 0) {
                setErrors(generateErrors);
            }
        } catch (error) {
            console.error('生成失败:', error);
            const axiosError = error as { response?: { status?: number; data?: unknown } };
            const status = axiosError?.response?.status;
            const data = axiosError?.response?.data as { error?: unknown } | undefined;
            const serverMessage = data && typeof data.error === 'string' ? data.error : '';
            const statusText = typeof status === 'number' ? `（HTTP ${status}）` : '';
            message.error(serverMessage ? `${serverMessage}${statusText}` : `生成失败，请检查后端服务${statusText}`);
        } finally {
            setSingleLoading(false);
        }
    };

    const handleGenerateBrand = async (brand: BrandInfo, imageFiles: File[]) => {
        if (selectedStrategies.length === 0) {
            message.warning('请至少选择一种生成策略');
            return;
        }

        setSingleLoading(true);
        setArticles([]);
        setErrors([]);
        setProcessSteps([]);
        setResearchMeta(null);

        try {
            const subjectId = crypto.randomUUID();
            const uploadedImages = await uploadReferenceImages('brand_ip', imageFiles);
            const response = await axios.post(`${API_BASE}/generate`, {
                mode: 'brand_ip',
                subject_id: subjectId,
                brand,
                strategies: selectedStrategies,
                reference_images: uploadedImages,
            });

            const generatedArticles: ArticleResult[] = Array.isArray(response.data.articles) ? response.data.articles : [];
            const generateErrors: string[] = Array.isArray(response.data.errors) ? response.data.errors : [];
            const nextProcess: ResearchProcessStep[] = Array.isArray(response.data.process) ? response.data.process : [];
            const nextResearchMeta =
                response.data.research_meta && typeof response.data.research_meta === 'object'
                    ? (response.data.research_meta as Record<string, unknown>)
                    : null;
            setProcessSteps(nextProcess);
            setResearchMeta(nextResearchMeta);

            if (generatedArticles.length > 0) {
                setArticles(generatedArticles);
                message.success(`成功生成 ${generatedArticles.length} 篇内容`);
                const researchSnapshotId =
                    typeof response.data.research_snapshot_id === 'string' ? response.data.research_snapshot_id : undefined;
                await saveGeneratedArticles(
                    'brand_ip',
                    subjectId,
                    brand.name,
                    brand,
                    generatedArticles,
                    0,
                    researchSnapshotId,
                    uploadedImages
                );
            }

            if (generateErrors.length > 0) {
                setErrors(generateErrors);
            }
        } catch (error) {
            console.error('生成失败:', error);
            const axiosError = error as { response?: { status?: number; data?: unknown } };
            const status = axiosError?.response?.status;
            const data = axiosError?.response?.data as { error?: unknown } | undefined;
            const serverMessage = data && typeof data.error === 'string' ? data.error : '';
            const statusText = typeof status === 'number' ? `（HTTP ${status}）` : '';
            message.error(serverMessage ? `${serverMessage}${statusText}` : `生成失败，请检查后端服务${statusText}`);
        } finally {
            setSingleLoading(false);
        }
    };

    const handleBatchUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const raw = JSON.parse(e.target?.result as string);
                const parsed = parseProductsJson(raw);
                if (parsed.length === 0) {
                    message.error('未识别到有效商品列表（需要 JSON 数组，且每项至少包含 name 与 price）');
                    return;
                }
                setBatchProducts(parsed);
                message.success(`已导入 ${parsed.length} 个商品`);
            } catch {
                message.error('JSON解析失败');
            }
        };
        reader.readAsText(file);
        return false;
    };

    const startBatchGenerate = async () => {
        if (selectedStrategies.length === 0) {
            message.warning('请至少选择一种生成策略');
            return;
        }
        if (batchProducts.length === 0) {
            message.warning('请先导入商品 JSON 列表');
            return;
        }
        batchCancelRef.current = false;
        setBatchLoading(true);
        setBatchErrors([]);
        setBatchProgress({
            total: batchProducts.length * selectedStrategies.length,
            done: 0,
            success: 0,
            failed: 0,
        });

        const successRef = { current: 0 };
        const failedRef = { current: 0 };

        const productIdMap = new Map<string, string>();
        for (const p of batchProducts) {
            const key = JSON.stringify({ name: p.name, price: p.price, category: p.category ?? '' });
            productIdMap.set(key, crypto.randomUUID());
        }

        const generateAndSave = async (product: ProductInfo, strategy: string) => {
            if (batchCancelRef.current) return;
            try {
                const key = JSON.stringify({ name: product.name, price: product.price, category: product.category ?? '' });
                const subjectId = productIdMap.get(key) || crypto.randomUUID();
                const referenceImages: ReferenceImagePayload[] = (product.image_urls ?? []).slice(0, 2).map((url) => ({
                    public_url: url,
                    source_type: 'url',
                }));
                const response = await axios.post(`${API_BASE}/generate`, {
                    mode: 'sku',
                    subject_id: subjectId,
                    product,
                    strategies: [strategy],
                    reference_images: referenceImages,
                });
                const generatedArticles: ArticleResult[] = Array.isArray(response.data.articles) ? response.data.articles : [];
                const persistedReferenceImages: ReferenceImagePayload[] = Array.isArray(response.data?.reference_images)
                    ? (response.data.reference_images as ReferenceImagePayload[])
                    : referenceImages;
                const first = generatedArticles[0];
                if (!first || !first.content) {
                    const serverErrors = Array.isArray(response.data?.errors)
                        ? response.data.errors.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                        : [];
                    const serverMessage =
                        typeof response.data?.error === 'string' && response.data.error.trim().length > 0
                            ? response.data.error.trim()
                            : '';
                    throw new Error(serverErrors[0] || serverMessage || '生成结果为空');
                }

                const subjectPayload = JSON.stringify(product);
                const researchSnapshotId =
                    typeof response.data.research_snapshot_id === 'string' ? response.data.research_snapshot_id : undefined;

                await axios.post(`${API_BASE}/articles`, {
                    mode: 'sku',
                    subject_id: subjectId,
                    subject_name: product.name,
                    subject_payload: subjectPayload,
                    product_name: product.name,
                    product_price: product.price,
                    product_id: subjectId,
                    product_payload: subjectPayload,
                    strategy: first.strategy,
                    strategy_name: first.strategy_name,
                    content: first.content,
                    research_snapshot_id: researchSnapshotId,
                    reference_images: persistedReferenceImages,
                    source_json_raw: product.source_json_raw,
                });

                setBatchProgress((prev) => ({
                    ...prev,
                    done: prev.done + 1,
                    success: prev.success + 1,
                }));
                successRef.current += 1;
            } catch (err) {
                const axiosError = err as { response?: { status?: number; data?: unknown } };
                const data = axiosError?.response?.data as { error?: unknown } | undefined;
                const serverMessage = data && typeof data.error === 'string' ? data.error : '';
                const statusText =
                    typeof axiosError?.response?.status === 'number' ? `（HTTP ${axiosError.response.status}）` : '';
                const msg = serverMessage || (err instanceof Error ? `${err.message}${statusText}` : String(err));
                setBatchErrors((prev) => [`${strategy} / ${product.name}: ${msg}`, ...prev].slice(0, 50));
                setBatchProgress((prev) => ({
                    ...prev,
                    done: prev.done + 1,
                    failed: prev.failed + 1,
                }));
                failedRef.current += 1;
            }
        };

        try {
            for (const strategy of selectedStrategies) {
                if (batchCancelRef.current) break;
                await runPool(batchProducts, 10, async (product) => {
                    await generateAndSave(product, strategy);
                });
            }
            if (batchCancelRef.current) {
                message.warning('批量生成已停止（未发送的任务已取消）');
            } else {
                message.success(`批量生成完成：成功 ${successRef.current}，失败 ${failedRef.current}`);
            }
        } finally {
            setBatchLoading(false);
        }
    };

    const stopBatch = () => {
        batchCancelRef.current = true;
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 16 }}>
                <Tabs
                    activeKey={contentMode}
                    onChange={(k) => setContentMode(k as ContentMode)}
                    items={[
                        { key: 'sku', label: '商品SKU模式' },
                        { key: 'brand_ip', label: '品牌IP模式' },
                    ]}
                />
            </div>

            {contentMode === 'sku' && (
                <div style={{ marginBottom: 16 }}>
                    <Tabs
                        activeKey={generateMode}
                        onChange={(k) => setGenerateMode(k as 'single' | 'batch')}
                        items={[
                            { key: 'single', label: '单个生成' },
                            { key: 'batch', label: '批量生成' },
                        ]}
                    />
                </div>
            )}

            {contentMode === 'brand_ip' && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="品牌IP模式当前支持单个生成 + 参考图片"
                    description="可上传最多5张图片，系统会结合官网与联网检索结果进行综合评测。"
                />
            )}

            <Row gutter={24}>
                <Col xs={24} lg={10}>
                    <div style={{ position: 'sticky', top: 24 }}>
                        {contentMode === 'sku' ? (
                            generateMode === 'single' ? (
                                <ProductForm onSubmit={handleGenerateSku} loading={effectiveLoading} />
                            ) : (
                                <div
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: '14px 16px',
                                            background: 'var(--bg-tertiary)',
                                            borderBottom: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                                            批量商品
                                        </Text>
                                        <Upload accept=".json" showUploadList={false} beforeUpload={handleBatchUpload}>
                                            <Button type="text" disabled={effectiveLoading} style={{ color: 'var(--text-secondary)' }}>
                                                导入JSON数组
                                            </Button>
                                        </Upload>
                                    </div>
                                    <div style={{ padding: 16 }}>
                                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                已导入：<Text style={{ color: 'var(--text-primary)' }}>{batchProducts.length}</Text> 个商品
                                            </div>
                                            <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                                                批量JSON可为每个商品提供最多2个图片URL字段：`image_urls` 或 `imageUrls`
                                            </div>
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    onClick={startBatchGenerate}
                                                    disabled={batchProducts.length === 0 || selectedStrategies.length === 0}
                                                    loading={batchLoading}
                                                    style={{ background: 'var(--accent-primary)', border: 'none' }}
                                                >
                                                    开始批量生成
                                                </Button>
                                                <Button onClick={stopBatch} disabled={!batchLoading}>
                                                    停止
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        if (batchLoading) return;
                                                        setBatchProducts([]);
                                                        setBatchErrors([]);
                                                        setBatchProgress({ total: 0, done: 0, success: 0, failed: 0 });
                                                    }}
                                                    disabled={batchLoading || batchProducts.length === 0}
                                                >
                                                    清空
                                                </Button>
                                            </Space>
                                        </Space>
                                    </div>
                                </div>
                            )
                        ) : (
                            <BrandIpForm onSubmit={handleGenerateBrand} loading={effectiveLoading} />
                        )}

                        <div style={{ marginTop: 16 }}>
                            <StrategySelector mode={contentMode} value={selectedStrategies} onChange={setSelectedStrategies} />
                        </div>

                        {contentMode === 'brand_ip' && (
                            <div style={{ marginTop: 12 }}>
                                <Tag color="orange">仅对比评测策略</Tag>
                            </div>
                        )}
                    </div>
                </Col>

                <Col xs={24} lg={14}>
                    <div
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            minHeight: 500,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                padding: '14px 16px',
                                background: 'var(--bg-tertiary)',
                                borderBottom: '1px solid var(--border-primary)',
                            }}
                        >
                            <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                                生成结果
                            </Text>
                        </div>

                        <div style={{ padding: 16 }}>
                            {generateMode === 'single' && processSteps.length > 0 && (
                                <Alert
                                    type="info"
                                    message="流程状态"
                                    description={
                                        <div>
                                            {processSteps.map((step) => (
                                                <div key={step.key} style={{ marginBottom: 6 }}>
                                                    <Text style={{ color: 'var(--text-primary)' }}>{step.label}</Text>
                                                    <Tag
                                                        color={
                                                            step.status === 'success'
                                                                ? 'green'
                                                                : step.status === 'failed'
                                                                  ? 'red'
                                                                  : 'default'
                                                        }
                                                        style={{ marginLeft: 8 }}
                                                    >
                                                        {step.status}
                                                    </Tag>
                                                    {step.detail && (
                                                        <Text style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
                                                            {step.detail}
                                                        </Text>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    style={{ marginBottom: 12 }}
                                />
                            )}

                            {generateMode === 'single' && researchMeta && (
                                <Alert
                                    type="success"
                                    message="研究摘要"
                                    description={`来源数：${String(researchMeta.source_count ?? 0)}，降级：${String(
                                        researchMeta.degraded ?? false
                                    )}`}
                                    style={{ marginBottom: 12 }}
                                />
                            )}

                            {generateMode === 'single' && errors.length > 0 && (
                                <Alert
                                    type="warning"
                                    message="部分策略生成失败"
                                    description={errors.join('; ')}
                                    style={{ marginBottom: 16 }}
                                    closable
                                />
                            )}

                            {generateMode === 'single' && singleLoading ? (
                                <div style={{ padding: 80, textAlign: 'center' }}>
                                    <Spin size="large" />
                                    <Paragraph style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
                                        正在生成内容，请稍候...
                                    </Paragraph>
                                </div>
                            ) : generateMode === 'single' && articles.length > 0 ? (
                                <Tabs
                                    items={articles.map((article) => ({
                                        key: `${article.mode || contentMode}-${article.strategy}`,
                                        label: article.strategy_name,
                                        children: <MarkdownPreview content={article.content} />,
                                    }))}
                                    style={{ marginTop: -8 }}
                                />
                            ) : contentMode === 'sku' && generateMode === 'batch' ? (
                                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                    <Progress percent={batchPercent} status={batchLoading ? 'active' : 'normal'} />
                                    <div style={{ color: 'var(--text-secondary)' }}>
                                        进度：<Text style={{ color: 'var(--text-primary)' }}>{batchProgress.done}</Text>/
                                        <Text style={{ color: 'var(--text-primary)' }}>{batchProgress.total}</Text>，
                                        成功 <Text style={{ color: 'var(--text-primary)' }}>{batchProgress.success}</Text>，
                                        失败 <Text style={{ color: 'var(--text-primary)' }}>{batchProgress.failed}</Text>
                                    </div>
                                    {batchErrors.length > 0 ? (
                                        <List
                                            size="small"
                                            bordered
                                            dataSource={batchErrors}
                                            renderItem={(item) => (
                                                <List.Item style={{ color: 'var(--text-secondary)' }}>{item}</List.Item>
                                            )}
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        />
                                    ) : (
                                        <Empty
                                            description={
                                                <span style={{ color: 'var(--text-tertiary)' }}>
                                                    导入商品JSON数组并点击“开始批量生成”
                                                </span>
                                            }
                                            style={{ padding: 40 }}
                                        />
                                    )}
                                </Space>
                            ) : (
                                <div style={{ padding: 80, textAlign: 'center' }}>
                                    <Empty
                                        description={
                                            <span style={{ color: 'var(--text-tertiary)' }}>
                                                {contentMode === 'sku'
                                                    ? '填写商品信息并选择策略后点击“生成内容”'
                                                    : '填写品牌IP信息并选择策略后点击“生成内容”'}
                                            </span>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
}
