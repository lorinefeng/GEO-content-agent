'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Row, Col, Typography, Tabs, Empty, Spin, message, Alert, Upload, Button, Space, Progress, List } from 'antd';
import ProductForm, { ProductInfo } from '@/components/ProductForm';
import StrategySelector from '@/components/StrategySelector';
import MarkdownPreview from '@/components/MarkdownPreview';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Paragraph, Text } = Typography;

interface ArticleResult {
    strategy: string;
    strategy_name: string;
    content: string;
}

const API_BASE = '/api';

type BatchProgress = {
    total: number;
    done: number;
    success: number;
    failed: number;
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
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
    const [mode, setMode] = useState<'single' | 'batch'>('single');
    const [singleLoading, setSingleLoading] = useState(false);
    const [articles, setArticles] = useState<ArticleResult[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
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

    if (authLoading) {
        return (
            <div style={{ padding: 80, textAlign: 'center' }}>
                <Spin size="large" />
                <Paragraph style={{ color: 'var(--text-secondary)', marginTop: 16 }}>正在校验登录状态...</Paragraph>
            </div>
        );
    }

    const handleGenerate = async (product: ProductInfo) => {
        if (selectedStrategies.length === 0) {
            message.warning('请至少选择一种生成策略');
            return;
        }

        setSingleLoading(true);
        setArticles([]);
        setErrors([]);

        try {
            const response = await axios.post(`${API_BASE}/generate`, {
                product,
                strategies: selectedStrategies,
            });

            const generatedArticles: ArticleResult[] = Array.isArray(response.data.articles) ? response.data.articles : [];
            const generateErrors: string[] = Array.isArray(response.data.errors) ? response.data.errors : [];

            if (generatedArticles.length > 0) {
                setArticles(generatedArticles);
                message.success(`成功生成 ${generatedArticles.length} 篇内容`);

                const product_id = crypto.randomUUID();
                const product_payload = JSON.stringify(product);
                const saveResults = await Promise.allSettled(
                    generatedArticles.map((article) =>
                        axios.post(`${API_BASE}/articles`, {
                            product_name: product.name,
                            product_price: product.price,
                            product_id,
                            product_payload,
                            strategy: article.strategy,
                            strategy_name: article.strategy_name,
                            content: article.content,
                        })
                    )
                );

                const failedCount = saveResults.filter((r) => r.status === 'rejected').length;
                if (failedCount > 0) {
                    message.warning(`内容已生成，但有 ${failedCount} 篇保存历史失败`);
                }
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
                const response = await axios.post(`${API_BASE}/generate`, { product, strategies: [strategy] });
                const generatedArticles: ArticleResult[] = Array.isArray(response.data.articles) ? response.data.articles : [];
                const first = generatedArticles[0];
                if (!first || !first.content) throw new Error('生成结果为空');

                const product_payload = JSON.stringify(product);
                const key = JSON.stringify({ name: product.name, price: product.price, category: product.category ?? '' });
                const product_id = productIdMap.get(key) || crypto.randomUUID();

                await axios.post(`${API_BASE}/articles`, {
                    product_name: product.name,
                    product_price: product.price,
                    product_id,
                    product_payload,
                    strategy: first.strategy,
                    strategy_name: first.strategy_name,
                    content: first.content,
                });

                setBatchProgress((prev) => ({
                    ...prev,
                    done: prev.done + 1,
                    success: prev.success + 1,
                }));
                successRef.current += 1;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
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
                    activeKey={mode}
                    onChange={(k) => setMode(k as 'single' | 'batch')}
                    items={[
                        { key: 'single', label: '单个生成' },
                        { key: 'batch', label: '批量生成' },
                    ]}
                />
            </div>
            <Row gutter={24}>
                {/* 左侧：输入区域 */}
                <Col xs={24} lg={10}>
                    <div style={{ position: 'sticky', top: 24 }}>
                        {mode === 'single' ? (
                            <ProductForm onSubmit={handleGenerate} loading={effectiveLoading} />
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
                        )}
                        <div style={{ marginTop: 16 }}>
                            <StrategySelector value={selectedStrategies} onChange={setSelectedStrategies} />
                        </div>
                    </div>
                </Col>

                {/* 右侧：结果区域 */}
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
                        {/* 标题栏 */}
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

                        {/* 内容区 */}
                        <div style={{ padding: 16 }}>
                            {mode === 'single' && errors.length > 0 && (
                                <Alert
                                    type="warning"
                                    message="部分策略生成失败"
                                    description={errors.join('; ')}
                                    style={{ marginBottom: 16 }}
                                    closable
                                />
                            )}

                            {mode === 'single' && singleLoading ? (
                                <div style={{ padding: 80, textAlign: 'center' }}>
                                    <Spin size="large" />
                                    <Paragraph style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
                                        正在生成内容，请稍候...
                                    </Paragraph>
                                </div>
                            ) : mode === 'single' && articles.length > 0 ? (
                                <Tabs
                                    items={articles.map((article) => ({
                                        key: article.strategy,
                                        label: article.strategy_name,
                                        children: <MarkdownPreview content={article.content} />,
                                    }))}
                                    style={{ marginTop: -8 }}
                                />
                            ) : mode === 'batch' ? (
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
                                                填写商品信息并选择策略后点击“生成内容”
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
