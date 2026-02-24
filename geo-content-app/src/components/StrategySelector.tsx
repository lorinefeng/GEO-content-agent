'use client';

import React from 'react';
import { Checkbox, Typography, Tag, Spin, Empty } from 'antd';
import axios from 'axios';

const { Text, Paragraph } = Typography;

export type ContentMode = 'sku' | 'brand_ip';

interface Strategy {
    id: string;
    name: string;
    description: string;
    requires_research?: boolean;
}

interface StrategySelectorProps {
    mode: ContentMode;
    value?: string[];
    onChange?: (value: string[]) => void;
}

export default function StrategySelector({ mode, value = [], onChange }: StrategySelectorProps) {
    const [strategies, setStrategies] = React.useState<Strategy[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let mounted = true;
        setLoading(true);
        axios
            .get('/api/strategies', { params: { mode } })
            .then((res) => {
                if (!mounted) return;
                const list = Array.isArray(res.data?.strategies) ? (res.data.strategies as Strategy[]) : [];
                setStrategies(list);
            })
            .catch(() => {
                if (!mounted) return;
                setStrategies([]);
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [mode]);

    React.useEffect(() => {
        if (loading) return;
        const available = new Set(strategies.map((item) => item.id));
        const filtered = value.filter((item) => available.has(item));
        if (filtered.length !== value.length) {
            onChange?.(filtered);
            return;
        }
        if (filtered.length === 0 && strategies.length > 0) {
            onChange?.([strategies[0].id]);
        }
    }, [loading, strategies, value, onChange]);

    const handleToggle = (strategyId: string) => {
        const newValue = value.includes(strategyId)
            ? value.filter((v) => v !== strategyId)
            : [...value, strategyId];
        onChange?.(newValue);
    };

    return (
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
                    选择生成策略
                </Text>
                {value.length > 0 && (
                    <Tag
                        style={{
                            marginLeft: 8,
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                        }}
                    >
                        已选 {value.length}
                    </Tag>
                )}
            </div>

            <div style={{ padding: 8 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <Spin size="small" />
                    </div>
                ) : strategies.length === 0 ? (
                    <Empty description={<span style={{ color: 'var(--text-tertiary)' }}>暂无可用策略</span>} />
                ) : (
                    strategies.map((strategy) => {
                        const isSelected = value.includes(strategy.id);
                        return (
                            <div
                                key={strategy.id}
                                onClick={() => handleToggle(strategy.id)}
                                style={{
                                    padding: '12px 14px',
                                    background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease',
                                    marginBottom: 4,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <Checkbox checked={isSelected} style={{ marginTop: 2 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                                                {strategy.name}
                                            </Text>
                                            {strategy.requires_research && (
                                                <Tag
                                                    style={{
                                                        fontSize: 10,
                                                        padding: '0 6px',
                                                        lineHeight: '18px',
                                                        background: 'var(--bg-tertiary)',
                                                        border: '1px solid var(--border-primary)',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    联网
                                                </Tag>
                                            )}
                                        </div>
                                        <Paragraph
                                            style={{
                                                color: 'var(--text-tertiary)',
                                                margin: 0,
                                                marginTop: 2,
                                                fontSize: 13,
                                            }}
                                        >
                                            {strategy.description}
                                        </Paragraph>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
