'use client';

import React from 'react';
import {
    Alert,
    Button,
    Empty,
    Input,
    Modal,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import { DownloadOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Text } = Typography;
const API_BASE = '/api';

interface QuestionPackageRow {
    id: string;
    article_id: string;
    mode: 'sku';
    product_id: string;
    product_name: string;
    strategy: string;
    strategy_name: string;
    status: 'generated' | 'fallback' | 'edited' | string;
    error_message?: string | null;
    package_json: string;
    created_at: string;
    updated_at?: string | null;
    article_created_at?: string | null;
}

type QuestionPackagePayload = {
    keywords?: Array<{ keyword?: string; bucket?: string }>;
    questions?: {
        coarse?: Array<unknown>;
        medium?: Array<unknown>;
        fine?: Array<unknown>;
    };
};

type TreeRow =
    | {
          key: string;
          rowType: 'root';
          product_id: string;
          product_name: string;
          package_count: number;
          children: TreeRow[];
      }
    | (QuestionPackageRow & {
          key: string;
          rowType: 'leaf';
          keyword_count: number;
          coarse_count: number;
          medium_count: number;
          fine_count: number;
      });

const parsePackagePayload = (raw: string): QuestionPackagePayload | null => {
    try {
        return JSON.parse(raw) as QuestionPackagePayload;
    } catch {
        return null;
    }
};

const countPackageMetrics = (raw: string) => {
    const parsed = parsePackagePayload(raw);
    return {
        keywordCount: Array.isArray(parsed?.keywords) ? parsed?.keywords.length : 0,
        coarseCount: Array.isArray(parsed?.questions?.coarse) ? parsed?.questions?.coarse.length : 0,
        mediumCount: Array.isArray(parsed?.questions?.medium) ? parsed?.questions?.medium.length : 0,
        fineCount: Array.isArray(parsed?.questions?.fine) ? parsed?.questions?.fine.length : 0,
    };
};

const extractFilename = (contentDisposition?: string) => {
    if (!contentDisposition) return '';
    const match = /filename="([^"]+)"/i.exec(contentDisposition);
    return match?.[1] || '';
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'question-packages.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

const statusColorMap: Record<string, string> = {
    generated: 'green',
    fallback: 'orange',
    edited: 'blue',
};

export default function QuestionDesignPage() {
    const { loading: authLoading } = useRequireAuth();
    const [loading, setLoading] = React.useState(true);
    const [rows, setRows] = React.useState<QuestionPackageRow[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);
    const [searchText, setSearchText] = React.useState('');
    const [modalVisible, setModalVisible] = React.useState(false);
    const [activePackage, setActivePackage] = React.useState<QuestionPackageRow | null>(null);
    const [draftJson, setDraftJson] = React.useState('');
    const [savedJson, setSavedJson] = React.useState('');
    const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'invalid' | 'error'>('idle');
    const [exportingIds, setExportingIds] = React.useState<Record<string, boolean>>({});
    const saveTimerRef = React.useRef<number | null>(null);

    const fetchPackages = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/question-packages`);
            setRows(Array.isArray(response.data?.packages) ? (response.data.packages as QuestionPackageRow[]) : []);
        } catch (error) {
            console.error('获取问题包失败:', error);
            message.error('获取问题设计数据失败');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (authLoading) return;
        void fetchPackages();
    }, [authLoading, fetchPackages]);

    React.useEffect(() => {
        if (!modalVisible || !activePackage) return;
        if (draftJson === savedJson) {
            if (saveState === 'saving') setSaveState('saved');
            return;
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(draftJson);
        } catch {
            setSaveState('invalid');
            return;
        }

        setSaveState('saving');
        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = window.setTimeout(async () => {
            try {
                const response = await axios.patch(`${API_BASE}/question-packages/${activePackage.id}`, {
                    package_json: parsed,
                });
                const updated = response.data?.package as QuestionPackageRow | undefined;
                if (updated) {
                    setRows((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                    setActivePackage(updated);
                    setSavedJson(draftJson);
                    setSaveState('saved');
                } else {
                    setSaveState('error');
                }
            } catch (error) {
                console.error('自动保存问题包失败:', error);
                setSaveState('error');
            }
        }, 1200);

        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }
        };
    }, [activePackage, draftJson, modalVisible, saveState, savedJson]);

    React.useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
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

    const openEditor = (row: QuestionPackageRow) => {
        const pretty = (() => {
            try {
                return JSON.stringify(JSON.parse(row.package_json), null, 2);
            } catch {
                return row.package_json;
            }
        })();
        setActivePackage(row);
        setDraftJson(pretty);
        setSavedJson(pretty);
        setSaveState('idle');
        setModalVisible(true);
    };

    const handleSingleExport = async (id: string) => {
        setExportingIds((prev) => ({ ...prev, [id]: true }));
        try {
            const res = await axios.get(`${API_BASE}/question-packages/${id}/export`, { responseType: 'blob' });
            const filename = extractFilename(res.headers?.['content-disposition']) || `question-package-${id}.json`;
            downloadBlob(res.data as Blob, filename);
        } catch (error) {
            console.error('导出问题包失败:', error);
            message.error('导出失败');
        } finally {
            setExportingIds((prev) => ({ ...prev, [id]: false }));
        }
    };

    const handleBatchExport = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请先选择至少一个问题包');
            return;
        }
        try {
            const res = await axios.post(
                `${API_BASE}/question-packages/export`,
                { ids: selectedRowKeys },
                { responseType: 'blob' }
            );
            const filename = extractFilename(res.headers?.['content-disposition']) || `question-packages-${selectedRowKeys.length}.json`;
            downloadBlob(res.data as Blob, filename);
        } catch (error) {
            console.error('批量导出问题包失败:', error);
            message.error('批量导出失败');
        }
    };

    const filtered = rows.filter((row) => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return true;
        return (
            row.product_name.toLowerCase().includes(keyword) ||
            row.strategy_name.toLowerCase().includes(keyword) ||
            row.strategy.toLowerCase().includes(keyword)
        );
    });

    const grouped = new Map<string, TreeRow>();
    for (const row of filtered) {
        const metrics = countPackageMetrics(row.package_json);
        const leaf: TreeRow = {
            ...row,
            key: row.id,
            rowType: 'leaf',
            keyword_count: metrics.keywordCount,
            coarse_count: metrics.coarseCount,
            medium_count: metrics.mediumCount,
            fine_count: metrics.fineCount,
        };
        const groupKey = row.product_id || `sku-${row.id}`;
        const existing = grouped.get(groupKey);
        if (!existing) {
            grouped.set(groupKey, {
                key: `root-${groupKey}`,
                rowType: 'root',
                product_id: groupKey,
                product_name: row.product_name,
                package_count: 1,
                children: [leaf],
            });
            continue;
        }
        if (existing.rowType === 'root') {
            existing.children.push(leaf);
            existing.package_count += 1;
        }
    }

    const treeData = Array.from(grouped.values()).map((group) => {
        if (group.rowType !== 'root') return group;
        group.children.sort((a, b) => {
            if (a.rowType !== 'leaf' || b.rowType !== 'leaf') return 0;
            return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
        });
        return group;
    });

    const columns = [
        {
            title: 'SKU / 文章',
            dataIndex: 'product_name',
            key: 'product_name',
            render: (_: unknown, record: TreeRow) => {
                if (record.rowType === 'root') {
                    return (
                        <div>
                            <Text strong style={{ color: 'var(--text-primary)' }}>
                                {record.product_name}
                            </Text>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 2 }}>
                                SKU 根节点 · 共 {record.package_count} 个问题包
                            </div>
                        </div>
                    );
                }
                return (
                    <div>
                        <Text strong style={{ color: 'var(--text-primary)' }}>
                            {record.product_name}
                        </Text>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 2 }}>
                            Article ID: {record.article_id}
                        </div>
                    </div>
                );
            },
        },
        {
            title: '策略',
            dataIndex: 'strategy_name',
            key: 'strategy_name',
            width: 180,
            render: (_: unknown, record: TreeRow) =>
                record.rowType === 'root' ? (
                    <Text style={{ color: 'var(--text-tertiary)' }}>-</Text>
                ) : (
                    <Tag color="gold">{record.strategy_name}</Tag>
                ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (_: unknown, record: TreeRow) =>
                record.rowType === 'root' ? (
                    <Text style={{ color: 'var(--text-tertiary)' }}>分组</Text>
                ) : (
                    <Tag color={statusColorMap[record.status] || 'default'}>{record.status}</Tag>
                ),
        },
        {
            title: '关键词 / 问题',
            key: 'counts',
            width: 240,
            render: (_: unknown, record: TreeRow) => {
                if (record.rowType === 'root') {
                    return <Text style={{ color: 'var(--text-tertiary)' }}>树状归档</Text>;
                }
                return (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        关键词 {record.keyword_count} 个
                        <br />
                        粗 {record.coarse_count} / 中 {record.medium_count} / 细 {record.fine_count}
                    </div>
                );
            },
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: 180,
            render: (_: unknown, record: TreeRow) => {
                if (record.rowType === 'root') {
                    return <Text style={{ color: 'var(--text-tertiary)' }}>-</Text>;
                }
                return (
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {new Date(record.updated_at || record.created_at).toLocaleString('zh-CN')}
                    </Text>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 220,
            render: (_: unknown, record: TreeRow) => {
                if (record.rowType === 'root') {
                    return null;
                }
                return (
                    <Space>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEditor(record)}
                            style={{ color: 'var(--accent-primary)' }}
                        >
                            查看 / 编辑
                        </Button>
                        <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            loading={!!exportingIds[record.id]}
                            onClick={() => void handleSingleExport(record.id)}
                        />
                    </Space>
                );
            },
        },
    ];

    return (
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="SKU 问题设计"
                description="每篇 SKU 文章在入库后会自动生成一份问题包。问题包按 SKU 树状归档，可直接编辑 JSON，并以最新状态导出。"
            />

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
                        gap: 12,
                        flexWrap: 'wrap',
                    }}
                >
                    <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        问题包列表
                    </Text>
                    <Space>
                        <Button icon={<DownloadOutlined />} onClick={handleBatchExport} disabled={selectedRowKeys.length === 0}>
                            批量导出
                        </Button>
                        <Input
                            placeholder="搜索商品名或策略"
                            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 220 }}
                        />
                    </Space>
                </div>

                <div style={{ padding: 16 }}>
                    {treeData.length > 0 ? (
                        <Table
                            rowKey="key"
                            loading={loading}
                            columns={columns}
                            dataSource={treeData}
                            pagination={{ pageSize: 12 }}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: (keys) => setSelectedRowKeys(keys),
                                getCheckboxProps: (record) => ({
                                    disabled: (record as TreeRow).rowType === 'root',
                                }),
                            }}
                        />
                    ) : (
                        <Empty
                            description={<span style={{ color: 'var(--text-tertiary)' }}>{loading ? '加载中...' : '暂无问题包'}</span>}
                            style={{ padding: 60 }}
                        />
                    )}
                </div>
            </div>

            <Modal
                title={
                    <Space>
                        <span>{activePackage?.product_name || '问题包详情'}</span>
                        {activePackage?.strategy_name ? <Tag color="gold">{activePackage.strategy_name}</Tag> : null}
                        {activePackage?.status ? <Tag color={statusColorMap[activePackage.status] || 'default'}>{activePackage.status}</Tag> : null}
                    </Space>
                }
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setActivePackage(null);
                    setDraftJson('');
                    setSavedJson('');
                    setSaveState('idle');
                }}
                footer={null}
                width={920}
                style={{ top: 32 }}
                styles={{
                    header: { background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)' },
                    body: { background: 'var(--bg-secondary)', padding: 20 },
                }}
            >
                {activePackage && (
                    <div>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                {saveState === 'saving'
                                    ? '正在自动保存...'
                                    : saveState === 'saved'
                                      ? '已自动保存最新 JSON'
                                      : saveState === 'invalid'
                                        ? '当前 JSON 不合法，暂未保存'
                                        : saveState === 'error'
                                          ? '自动保存失败，请检查网络或 JSON 内容'
                                          : '编辑后会自动覆盖保存'}
                            </div>
                            <Button icon={<DownloadOutlined />} onClick={() => void handleSingleExport(activePackage.id)}>
                                导出当前 JSON
                            </Button>
                        </div>

                        {activePackage.error_message ? (
                            <Alert
                                type="warning"
                                showIcon
                                style={{ marginBottom: 12 }}
                                message="最近一次自动生成有降级或失败记录"
                                description={activePackage.error_message}
                            />
                        ) : null}

                        <Input.TextArea
                            value={draftJson}
                            onChange={(e) => setDraftJson(e.target.value)}
                            autoSize={{ minRows: 20, maxRows: 26 }}
                            style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 13,
                                lineHeight: 1.65,
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-primary)',
                            }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}

