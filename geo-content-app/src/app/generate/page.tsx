'use client';

import React, { useState } from 'react';
import { Row, Col, Typography, Tabs, Empty, Spin, message, Alert } from 'antd';
import ProductForm, { ProductInfo } from '@/components/ProductForm';
import StrategySelector from '@/components/StrategySelector';
import MarkdownPreview from '@/components/MarkdownPreview';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Title, Paragraph, Text } = Typography;

interface ArticleResult {
    strategy: string;
    strategy_name: string;
    content: string;
}

const API_BASE = '/api';

export default function GeneratePage() {
    const { loading: authLoading } = useRequireAuth();
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [articles, setArticles] = useState<ArticleResult[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

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

        setLoading(true);
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

                const saveResults = await Promise.allSettled(
                    generatedArticles.map((article) =>
                        axios.post(`${API_BASE}/articles`, {
                            product_name: product.name,
                            product_price: product.price,
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
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Row gutter={24}>
                {/* 左侧：输入区域 */}
                <Col xs={24} lg={10}>
                    <div style={{ position: 'sticky', top: 24 }}>
                        <ProductForm onSubmit={handleGenerate} loading={loading} />
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
                            {errors.length > 0 && (
                                <Alert
                                    type="warning"
                                    message="部分策略生成失败"
                                    description={errors.join('; ')}
                                    style={{ marginBottom: 16 }}
                                    closable
                                />
                            )}

                            {loading ? (
                                <div style={{ padding: 80, textAlign: 'center' }}>
                                    <Spin size="large" />
                                    <Paragraph style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
                                        正在生成内容，请稍候...
                                    </Paragraph>
                                </div>
                            ) : articles.length > 0 ? (
                                <Tabs
                                    items={articles.map((article) => ({
                                        key: article.strategy,
                                        label: article.strategy_name,
                                        children: <MarkdownPreview content={article.content} />,
                                    }))}
                                    style={{ marginTop: -8 }}
                                />
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
