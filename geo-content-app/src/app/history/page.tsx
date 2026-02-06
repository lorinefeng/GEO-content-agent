'use client';

import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Empty, Space, Typography, Input, Select, message, Popconfirm, Spin } from 'antd';
import { EyeOutlined, DeleteOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons';
import MarkdownPreview from '@/components/MarkdownPreview';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Text } = Typography;

interface Article {
    id: string;
    product_name: string;
    product_price: number;
    strategy: string;
    strategy_name: string;
    content: string;
    created_at: string;
}

const API_BASE = '/api';

export default function HistoryPage() {
    const { loading: authLoading } = useRequireAuth();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStrategy, setFilterStrategy] = useState<string>('');

    const fetchArticles = async () => {
        try {
            const response = await axios.get(`${API_BASE}/articles`, {
                params: { strategy: filterStrategy || undefined },
            });
            setArticles(response.data.articles || []);
        } catch (error) {
            console.error('获取文章失败:', error);
            message.error('获取历史记录失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, [filterStrategy]);

    if (authLoading) {
        return (
            <div style={{ padding: 80, textAlign: 'center' }}>
                <Spin size="large" />
                <div style={{ color: 'var(--text-secondary)', marginTop: 16 }}>正在校验登录状态...</div>
            </div>
        );
    }

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`${API_BASE}/articles/${id}`);
            message.success('删除成功');
            fetchArticles();
        } catch {
            message.error('删除失败');
        }
    };

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            message.success('已复制到剪贴板');
        } catch {
            message.error('复制失败');
        }
    };

    const strategyColors: Record<string, string> = {
        comparison: 'gold',
        persona: 'green',
        smzdm_review: 'orange',
        smzdm_short: 'geekblue',
    };

    const filteredArticles = articles.filter((article) =>
        article.product_name.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: '商品名称',
            dataIndex: 'product_name',
            key: 'product_name',
            render: (text: string) => (
                <Text strong style={{ color: 'var(--text-primary)' }}>
                    {text}
                </Text>
            ),
        },
        {
            title: '价格',
            dataIndex: 'product_price',
            key: 'product_price',
            render: (price: number) => (
                <Text style={{ color: 'var(--accent-primary)' }}>¥{price}</Text>
            ),
            width: 100,
        },
        {
            title: '策略',
            dataIndex: 'strategy_name',
            key: 'strategy_name',
            render: (name: string, record: Article) => (
                <Tag color={strategyColors[record.strategy] || 'default'}>{name}</Tag>
            ),
            width: 160,
        },
        {
            title: '生成时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (time: string) => (
                <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {new Date(time).toLocaleString('zh-CN')}
                </Text>
            ),
            width: 160,
        },
        {
            title: '操作',
            key: 'action',
            width: 140,
            render: (_: unknown, record: Article) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setSelectedArticle(record);
                            setModalVisible(true);
                        }}
                        style={{ color: 'var(--accent-primary)' }}
                    >
                        查看
                    </Button>
                    <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(record.content)}
                        style={{ color: 'var(--text-tertiary)' }}
                    />
                    <Popconfirm
                        title="确认删除这篇文章？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="删除"
                        cancelText="取消"
                    >
                        <Button type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                }}
            >
                {/* 标题栏和筛选 */}
                <div
                    style={{
                        padding: '14px 16px',
                        background: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        历史记录
                    </Text>
                    <Space>
                        <Input
                            placeholder="搜索商品名称"
                            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 180 }}
                        />
                        <Select
                            placeholder="筛选策略"
                            allowClear
                            value={filterStrategy || undefined}
                            onChange={setFilterStrategy}
                            style={{ width: 140 }}
                            options={[
                                { value: 'comparison', label: '评测对比型' },
                                { value: 'persona', label: '用户画像型' },
                                { value: 'smzdm_review', label: 'SMZDM深度评测' },
                                { value: 'smzdm_short', label: 'SMZDM短评测' },
                            ]}
                        />
                    </Space>
                </div>

                {/* 表格或空状态 */}
                <div style={{ padding: 16 }}>
                    {filteredArticles.length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={filteredArticles}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    ) : (
                        <Empty
                            description={
                                <span style={{ color: 'var(--text-tertiary)' }}>
                                    {loading ? '加载中...' : '暂无历史记录'}
                                </span>
                            }
                            style={{ padding: 60 }}
                        />
                    )}
                </div>
            </div>

            {/* 详情弹窗 */}
            <Modal
                title={
                    <Space>
                        <Tag color={strategyColors[selectedArticle?.strategy || ''] || 'default'}>
                            {selectedArticle?.strategy_name}
                        </Tag>
                        <span>{selectedArticle?.product_name}</span>
                    </Space>
                }
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={900}
                style={{ top: 40 }}
                styles={{
                    header: { background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)' },
                    body: { background: 'var(--bg-secondary)', padding: 24 },
                }}
            >
                {selectedArticle && <MarkdownPreview content={selectedArticle.content} />}
            </Modal>
        </div>
    );
}
