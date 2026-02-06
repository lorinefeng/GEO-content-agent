'use client';

import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Button, Input, message, Spin, Empty, Table, Space, Popconfirm } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Text, Paragraph } = Typography;

interface Template {
    strategy: string;
    name: string;
    prompt: string;
}

interface TemplateRevision {
    id: string;
    changed_at: string;
    changed_by?: string | null;
}

const API_BASE = '/api';

const strategyList = [
    { id: 'comparison', name: '评测对比型' },
    { id: 'persona', name: '用户画像匹配型' },
    { id: 'smzdm_review', name: 'SMZDM深度评测' },
    { id: 'smzdm_short', name: 'SMZDM短评测' },
];

export default function TemplatesPage() {
    const { loading: authLoading } = useRequireAuth();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState('comparison');
    const [editedPrompt, setEditedPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [revisions, setRevisions] = useState<TemplateRevision[]>([]);
    const [loadingRevisions, setLoadingRevisions] = useState(false);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/templates`);
            setTemplates(response.data.templates || []);
        } catch (error) {
            console.error('获取模板失败:', error);
            message.error('获取模板失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchRevisions = async (strategy: string) => {
        setLoadingRevisions(true);
        try {
            const response = await axios.get(`${API_BASE}/templates/${strategy}/revisions`);
            setRevisions(response.data.revisions || []);
        } catch {
            setRevisions([]);
        } finally {
            setLoadingRevisions(false);
        }
    };

    useEffect(() => {
        const template = templates.find((t) => t.strategy === selectedStrategy);
        if (template) {
            setEditedPrompt(template.prompt);
            setHasChanges(false);
        }
        fetchRevisions(selectedStrategy);
    }, [selectedStrategy, templates]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API_BASE}/templates/${selectedStrategy}`, {
                prompt: editedPrompt,
            });
            message.success('模板保存成功');
            setHasChanges(false);
            fetchTemplates();
            fetchRevisions(selectedStrategy);
        } catch {
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleRollback = async (revisionId: string) => {
        setSaving(true);
        try {
            await axios.post(`${API_BASE}/templates/${selectedStrategy}/rollback`, { revision_id: revisionId });
            message.success('已回滚');
            setHasChanges(false);
            await fetchTemplates();
            await fetchRevisions(selectedStrategy);
        } catch {
            message.error('回滚失败');
        } finally {
            setSaving(false);
        }
    };

    const currentTemplate = templates.find((t) => t.strategy === selectedStrategy);

    if (authLoading) {
        return (
            <div style={{ padding: 80, textAlign: 'center' }}>
                <Spin size="large" />
                <Paragraph style={{ color: 'var(--text-secondary)', marginTop: 16 }}>正在校验登录状态...</Paragraph>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Row gutter={24}>
                {/* 左侧：策略列表 */}
                <Col xs={24} md={8} lg={6}>
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
                            }}
                        >
                            <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                                选择策略
                            </Text>
                        </div>
                        <div style={{ padding: 8 }}>
                            {strategyList.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedStrategy(s.id)}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        background: selectedStrategy === s.id ? 'var(--bg-tertiary)' : 'transparent',
                                        borderLeft: selectedStrategy === s.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                        transition: 'all 0.15s ease',
                                        marginBottom: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: selectedStrategy === s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: selectedStrategy === s.id ? 500 : 400,
                                        }}
                                    >
                                        {s.name}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>
                </Col>

                {/* 右侧：编辑区 */}
                <Col xs={24} md={16} lg={18}>
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
                            <div>
                                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                                    {currentTemplate?.name || '编辑模板'}
                                </Text>
                                {hasChanges && (
                                    <Text style={{ color: 'var(--accent-primary)', marginLeft: 8, fontSize: 12 }}>
                                        • 未保存
                                    </Text>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchTemplates}
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    刷新
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSave}
                                    loading={saving}
                                    disabled={!hasChanges}
                                    style={{
                                        background: hasChanges ? 'var(--accent-primary)' : undefined,
                                        borderColor: hasChanges ? 'var(--accent-primary)' : undefined,
                                    }}
                                >
                                    保存
                                </Button>
                            </div>
                        </div>

                        <div style={{ padding: 16 }}>
                            {loading ? (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <Spin />
                                </div>
                            ) : currentTemplate ? (
                                <>
                                    <Paragraph
                                        style={{
                                            color: 'var(--text-tertiary)',
                                            fontSize: 13,
                                            marginBottom: 12,
                                        }}
                                    >
                                        Prompt模板用于指导AI生成内容。支持使用占位符如 {'{product_name}'}, {'{price}'} 等。
                                    </Paragraph>
                                    <Input.TextArea
                                        value={editedPrompt}
                                        onChange={(e) => {
                                            setEditedPrompt(e.target.value);
                                            setHasChanges(true);
                                        }}
                                        rows={20}
                                        style={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 13,
                                            lineHeight: 1.6,
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-primary)',
                                        }}
                                    />

                                    <div style={{ marginTop: 16 }}>
                                        <Text strong style={{ color: 'var(--text-primary)' }}>
                                            模板变更记录
                                        </Text>
                                        <div style={{ marginTop: 10 }}>
                                            <Table
                                                size="small"
                                                rowKey="id"
                                                loading={loadingRevisions}
                                                dataSource={revisions}
                                                pagination={{ pageSize: 8 }}
                                                columns={[
                                                    {
                                                        title: '变更时间',
                                                        dataIndex: 'changed_at',
                                                        key: 'changed_at',
                                                        render: (v: string) => (
                                                            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                                {new Date(v).toLocaleString('zh-CN')}
                                                            </Text>
                                                        ),
                                                    },
                                                    {
                                                        title: '操作',
                                                        key: 'action',
                                                        width: 110,
                                                        render: (_: unknown, record: TemplateRevision) => (
                                                            <Space>
                                                                <Popconfirm
                                                                    title="确认回滚到该版本？"
                                                                    okText="回滚"
                                                                    cancelText="取消"
                                                                    onConfirm={() => handleRollback(record.id)}
                                                                >
                                                                    <Button size="small">回滚</Button>
                                                                </Popconfirm>
                                                            </Space>
                                                        ),
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Empty description="请选择一个策略" />
                            )}
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
}
