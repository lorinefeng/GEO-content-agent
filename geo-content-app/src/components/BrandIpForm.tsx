'use client';

import React from 'react';
import { Form, Input, Button, Typography, Tag, Upload } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

const { Text } = Typography;

export interface BrandInfo {
    name: string;
    website: string;
    industry_hint?: string;
    region?: string;
    description?: string;
    keywords?: string[];
}

interface BrandIpFormProps {
    onSubmit: (brand: BrandInfo, imageFiles: File[]) => void;
    loading?: boolean;
}

export default function BrandIpForm({ onSubmit, loading }: BrandIpFormProps) {
    const [form] = Form.useForm<BrandInfo>();
    const [keywords, setKeywords] = React.useState<string[]>([]);
    const [keywordInput, setKeywordInput] = React.useState('');
    const [imageFileList, setImageFileList] = React.useState<UploadFile[]>([]);

    const handleAddKeyword = () => {
        const next = keywordInput.trim();
        if (!next || keywords.includes(next)) return;
        setKeywords((prev) => [...prev, next]);
        setKeywordInput('');
    };

    const handleRemoveKeyword = (keyword: string) => {
        setKeywords((prev) => prev.filter((item) => item !== keyword));
    };

    const handleSubmit = (values: BrandInfo) => {
        const imageFiles = imageFileList.map((item) => item.originFileObj).filter(Boolean) as File[];
        onSubmit(
            {
                ...values,
                keywords,
            },
            imageFiles
        );
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
                    品牌IP信息
                </Text>
            </div>

            <div style={{ padding: 16 }}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>品牌/IP名称</span>}
                        name="name"
                        rules={[{ required: true, message: '请输入品牌/IP名称' }]}
                        style={{ marginBottom: 16 }}
                    >
                        <Input placeholder="例如：某某教育科技" />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>官网URL</span>}
                        name="website"
                        rules={[
                            { required: true, message: '请输入官网URL' },
                            { type: 'url', message: '请输入合法URL（http/https）' },
                        ]}
                        style={{ marginBottom: 16 }}
                    >
                        <Input placeholder="https://example.com" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <Form.Item
                            label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>行业提示</span>}
                            name="industry_hint"
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="如：在线教育 / SaaS / 跨境电商" />
                        </Form.Item>

                        <Form.Item
                            label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>地域</span>}
                            name="region"
                            initialValue="中国市场"
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="如：中国市场" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>补充说明</span>}
                        name="description"
                        style={{ marginBottom: 16 }}
                    >
                        <Input.TextArea rows={3} placeholder="补充品牌定位、核心产品、目标客群等信息..." />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>关键词</span>}
                        style={{ marginBottom: 20 }}
                    >
                        <div style={{ marginBottom: 8 }}>
                            {keywords.map((keyword) => (
                                <Tag
                                    key={keyword}
                                    closable
                                    onClose={() => handleRemoveKeyword(keyword)}
                                    style={{
                                        marginBottom: 4,
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-primary)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {keyword}
                                </Tag>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onPressEnter={handleAddKeyword}
                                placeholder="输入关键词后回车"
                                style={{ flex: 1 }}
                            />
                            <Button icon={<PlusOutlined />} onClick={handleAddKeyword}>
                                添加
                            </Button>
                        </div>
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>参考图片（可选，最多5张）</span>}
                        style={{ marginBottom: 20 }}
                    >
                        <Upload
                            multiple
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            beforeUpload={() => false}
                            maxCount={5}
                            fileList={imageFileList}
                            onChange={({ fileList }) => {
                                setImageFileList(fileList.slice(0, 5));
                            }}
                            onRemove={(file) => {
                                setImageFileList((prev) => prev.filter((item) => item.uid !== file.uid));
                                return true;
                            }}
                            disabled={loading}
                        >
                            <Button icon={<UploadOutlined />}>上传图片</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            style={{
                                height: 44,
                                fontWeight: 500,
                                background: 'var(--accent-primary)',
                                border: 'none',
                            }}
                        >
                            生成内容
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    );
}
