'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Empty, Space, Typography, Input, message, Popconfirm, Spin, Tabs, Alert } from 'antd';
import { EyeOutlined, DeleteOutlined, SearchOutlined, CopyOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import MarkdownPreview from '@/components/MarkdownPreview';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';
import type { ContentMode } from '@/components/StrategySelector';

const { Text } = Typography;

interface Article {
    id: string;
    mode?: ContentMode;
    subject_id?: string | null;
    subject_name?: string | null;
    subject_payload?: string | null;
    product_name: string;
    product_price: number;
    product_id?: string | null;
    strategy: string;
    strategy_name: string;
    content: string;
    published_url?: string | null;
    product_payload?: string | null;
    created_at: string;
    updated_at?: string | null;
}

const API_BASE = '/api';

const extractFilename = (contentDisposition?: string) => {
    if (!contentDisposition) return '';
    const match = /filename="([^"]+)"/i.exec(contentDisposition);
    return match?.[1] || '';
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export default function HistoryPage() {
    const { loading: authLoading } = useRequireAuth();
    const [modeFilter, setModeFilter] = useState<ContentMode>('sku');
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [savingUrlIds, setSavingUrlIds] = useState<Record<string, boolean>>({});
    const [savedUrlMap, setSavedUrlMap] = useState<Record<string, string>>({});
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const pendingSaveTimersRef = useRef<Record<string, number>>({});
    const articlesRef = useRef<Article[]>([]);
    const savedUrlMapRef = useRef<Record<string, string>>({});

    useEffect(() => {
        articlesRef.current = articles;
    }, [articles]);

    useEffect(() => {
        savedUrlMapRef.current = savedUrlMap;
    }, [savedUrlMap]);

    const fetchArticles = async (mode: ContentMode = modeFilter) => {
        try {
            const response = await axios.get(`${API_BASE}/articles`, {
                params: { mode },
            });
            const next = (response.data.articles || []) as Article[];
            setArticles(next);
            const map: Record<string, string> = {};
            for (const a of next) {
                map[a.id] = typeof a.published_url === 'string' ? a.published_url : '';
            }
            setSavedUrlMap(map);
            setSelectedRowKeys([]);
        } catch (error) {
            console.error('获取文章失败:', error);
            message.error('获取历史记录失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchArticles(modeFilter);
    }, [modeFilter]);

    const patchPublishedUrl = async (articleId: string, url: string, opts?: { silent?: boolean; keepalive?: boolean }) => {
        const lastSaved = savedUrlMapRef.current[articleId] ?? '';
        if (url === lastSaved) return;

        try {
            const res = await fetch(`${API_BASE}/articles/${articleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ published_url: url }),
                keepalive: !!opts?.keepalive,
            });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? ((await res.json()) as { error?: unknown; article?: Article })
                : null;
            if (!res.ok) {
                const err = data && typeof data.error === 'string' ? data.error : '';
                if (!opts?.silent) message.error(err || '保存失败');
                return;
            }
            const updated = data?.article;
            if (updated && updated.id) {
                setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, ...updated } : a)));
                setSavedUrlMap((prev) => ({
                    ...prev,
                    [articleId]: typeof updated.published_url === 'string' ? updated.published_url : '',
                }));
            } else {
                setSavedUrlMap((prev) => ({ ...prev, [articleId]: url }));
            }
            if (!opts?.silent) message.success('已保存发表URL');
        } catch {
            if (!opts?.silent) message.error('保存失败');
        }
    };

    const scheduleSavePublishedUrl = (articleId: string) => {
        const timers = pendingSaveTimersRef.current;
        const existing = timers[articleId];
        if (existing) window.clearTimeout(existing);
        timers[articleId] = window.setTimeout(() => {
            const current = articlesRef.current.find((a) => a.id === articleId);
            const url = typeof current?.published_url === 'string' ? current.published_url.trim() : '';
            void patchPublishedUrl(articleId, url, { silent: true });
        }, 800);
    };

    useEffect(() => {
        return () => {
            const timers = pendingSaveTimersRef.current;
            for (const key of Object.keys(timers)) {
                window.clearTimeout(timers[key]);
            }
            pendingSaveTimersRef.current = {};

            const snapshotArticles = articlesRef.current;
            const snapshotSaved = savedUrlMapRef.current;
            for (const a of snapshotArticles) {
                const url = typeof a.published_url === 'string' ? a.published_url.trim() : '';
                const lastSaved = snapshotSaved[a.id] ?? '';
                if (url !== lastSaved) {
                    void fetch(`${API_BASE}/articles/${a.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ published_url: url }),
                        keepalive: true,
                    });
                }
            }
        };
    }, []);

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
            fetchArticles(modeFilter);
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

    const savePublishedUrl = async (articleId: string) => {
        const timers = pendingSaveTimersRef.current;
        const existing = timers[articleId];
        if (existing) window.clearTimeout(existing);
        delete timers[articleId];

        const current = articlesRef.current.find((a) => a.id === articleId);
        const url = typeof current?.published_url === 'string' ? current.published_url.trim() : '';

        setSavingUrlIds((prev) => ({ ...prev, [articleId]: true }));
        try {
            await patchPublishedUrl(articleId, url, { silent: false });
        } finally {
            setSavingUrlIds((prev) => ({ ...prev, [articleId]: false }));
        }
    };

    const exportProduct = async (productId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/exports/product`, {
                params: { product_id: productId },
                responseType: 'blob',
            });
            const filename = extractFilename(res.headers?.['content-disposition']) || `product-${productId}.json`;
            downloadBlob(res.data as Blob, filename);
        } catch (e) {
            const axiosError = e as { response?: { data?: unknown } };
            const data = axiosError?.response?.data as { error?: unknown } | undefined;
            const serverMessage = data && typeof data.error === 'string' ? data.error : '';
            message.error(serverMessage || '导出失败');
        }
    };

    const exportSelectedProducts = async () => {
        if (modeFilter !== 'sku') {
            message.warning('品牌IP模式记录暂不支持按 product_id 批量导出');
            return;
        }

        const selected = articles.filter((a) => selectedRowKeys.includes(a.id));
        const productIds = Array.from(new Set(selected.map((a) => a.product_id).filter((x) => typeof x === 'string' && x.trim())));
        if (productIds.length === 0) {
            message.warning('所选记录均缺少 product_id（旧数据），无法批量导出');
            return;
        }
        try {
            const res = await axios.post(
                `${API_BASE}/exports/products`,
                { product_ids: productIds },
                { responseType: 'blob' }
            );
            const filename = extractFilename(res.headers?.['content-disposition']) || `products-${productIds.length}.json`;
            downloadBlob(res.data as Blob, filename);
        } catch (e) {
            const axiosError = e as { response?: { data?: unknown } };
            const data = axiosError?.response?.data as { error?: unknown } | undefined;
            const serverMessage = data && typeof data.error === 'string' ? data.error : '';
            message.error(serverMessage || '批量导出失败');
        }
    };

    const filteredArticles = articles.filter((article) => {
        const name = (article.subject_name || article.product_name || '').toLowerCase();
        return name.includes(searchText.toLowerCase());
    });

    const columns = [
        {
            title: modeFilter === 'sku' ? '商品名称' : '品牌IP名称',
            dataIndex: 'subject_name',
            key: 'subject_name',
            render: (_: unknown, record: Article) => (
                <Text strong style={{ color: 'var(--text-primary)' }}>
                    {record.subject_name || record.product_name}
                </Text>
            ),
        },
        {
            title: '价格',
            dataIndex: 'product_price',
            key: 'product_price',
            render: (price: number) =>
                modeFilter === 'sku' ? (
                    <Text style={{ color: 'var(--accent-primary)' }}>¥{price}</Text>
                ) : (
                    <Text style={{ color: 'var(--text-tertiary)' }}>-</Text>
                ),
            width: 100,
        },
        {
            title: '策略',
            dataIndex: 'strategy_name',
            key: 'strategy_name',
            render: (name: string) => <Tag color="gold">{name}</Tag>,
            width: 180,
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
            width: 180,
        },
        {
            title: '内容发表地址URL',
            dataIndex: 'published_url',
            key: 'published_url',
            width: 320,
            render: (_: unknown, record: Article) => {
                const value = typeof record.published_url === 'string' ? record.published_url : '';
                const saving = !!savingUrlIds[record.id];
                const addonAfter =
                    value && /^https?:\/\//i.test(value) ? (
                        <Button
                            type="text"
                            icon={<LinkOutlined />}
                            onClick={() => window.open(value, '_blank')}
                            style={{ padding: 0, height: 22 }}
                        />
                    ) : null;
                return (
                    <Input
                        placeholder="粘贴发布后的文章URL（http/https）"
                        value={value}
                        onChange={(e) => {
                            const next = e.target.value;
                            setArticles((prev) => prev.map((a) => (a.id === record.id ? { ...a, published_url: next } : a)));
                            scheduleSavePublishedUrl(record.id);
                        }}
                        onBlur={() => savePublishedUrl(record.id)}
                        onPressEnter={() => savePublishedUrl(record.id)}
                        disabled={saving}
                        addonAfter={addonAfter}
                    />
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 220,
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
                    <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                            if (modeFilter !== 'sku') {
                                message.warning('品牌IP模式记录暂不支持按 product_id 导出');
                                return;
                            }
                            const pid = typeof record.product_id === 'string' ? record.product_id : '';
                            if (!pid) {
                                message.warning('该记录缺少 product_id（旧数据），请重新生成后再导出');
                                return;
                            }
                            exportProduct(pid);
                        }}
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
            <div style={{ marginBottom: 16 }}>
                <Tabs
                    activeKey={modeFilter}
                    onChange={(key) => setModeFilter(key as ContentMode)}
                    items={[
                        { key: 'sku', label: 'SKU历史记录' },
                        { key: 'brand_ip', label: '品牌IP历史记录' },
                    ]}
                />
            </div>

            {modeFilter === 'brand_ip' && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="品牌IP导出说明"
                    description="当前导出接口仍基于SKU的 product_id。品牌IP导出将在后续里程碑升级为 subject 语义。"
                />
            )}

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
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        历史记录
                    </Text>
                    <Space>
                        <Button icon={<DownloadOutlined />} onClick={exportSelectedProducts} disabled={selectedRowKeys.length === 0}>
                            批量导出
                        </Button>
                        <Input
                            placeholder={modeFilter === 'sku' ? '搜索商品名称' : '搜索品牌IP名称'}
                            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 180 }}
                        />
                    </Space>
                </div>

                <div style={{ padding: 16 }}>
                    {filteredArticles.length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={filteredArticles}
                            rowKey="id"
                            loading={loading}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: (keys) => setSelectedRowKeys(keys),
                            }}
                            pagination={{ pageSize: 10 }}
                        />
                    ) : (
                        <Empty
                            description={
                                <span style={{ color: 'var(--text-tertiary)' }}>{loading ? '加载中...' : '暂无历史记录'}</span>
                            }
                            style={{ padding: 60 }}
                        />
                    )}
                </div>
            </div>

            <Modal
                title={
                    <Space>
                        <Tag color="gold">{selectedArticle?.strategy_name}</Tag>
                        <span>{selectedArticle?.subject_name || selectedArticle?.product_name}</span>
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
