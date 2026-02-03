'use client';

import React from 'react';
import { Checkbox, Typography, Space, Tag } from 'antd';

const { Text, Paragraph } = Typography;

interface Strategy {
    id: string;
    name: string;
    description: string;
    tag?: string;
}

const strategies: Strategy[] = [
    {
        id: 'comparison',
        name: '评测对比型',
        description: '专业评测对比，包含规格表格和竞品分析',
    },
    {
        id: 'persona',
        name: '用户画像匹配型',
        description: '面向特定用户群体的购物指南',
    },
    {
        id: 'smzdm_review',
        name: '什么值得买深度评测',
        description: '符合SMZDM平台风格的深度评测',
        tag: 'SMZDM',
    },
    {
        id: 'smzdm_short',
        name: '什么值得买短评测',
        description: '简洁的好物分享风格',
        tag: 'SMZDM',
    },
];

interface StrategySelectorProps {
    value?: string[];
    onChange?: (value: string[]) => void;
}

export default function StrategySelector({ value = [], onChange }: StrategySelectorProps) {
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
            {/* 标题栏 */}
            <div
                style={{
                    padding: '14px 16px',
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-primary)',
                }}
            >
                <Text
                    strong
                    style={{
                        color: 'var(--text-primary)',
                        fontSize: 14,
                    }}
                >
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

            {/* 策略列表 */}
            <div style={{ padding: 8 }}>
                {strategies.map((strategy) => {
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
                                        <Text
                                            strong
                                            style={{
                                                color: 'var(--text-primary)',
                                                fontSize: 14,
                                            }}
                                        >
                                            {strategy.name}
                                        </Text>
                                        {strategy.tag && (
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
                                                {strategy.tag}
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
                })}
            </div>
        </div>
    );
}
