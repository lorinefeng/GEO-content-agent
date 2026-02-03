'use client';

import React from 'react';
import { Form, Input, InputNumber, Button, Upload, message, Tag, Typography } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

const { Text } = Typography;

export interface ProductInfo {
    name: string;
    price: number;
    material?: string;
    color?: string;
    description?: string;
    category?: string;
    tags?: string[];
}

interface ProductFormProps {
    onSubmit: (product: ProductInfo) => void;
    loading?: boolean;
}

export default function ProductForm({ onSubmit, loading }: ProductFormProps) {
    const [form] = Form.useForm();
    const [tags, setTags] = React.useState<string[]>([]);
    const [tagInput, setTagInput] = React.useState('');

    const handleAddTag = () => {
        if (tagInput && !tags.includes(tagInput)) {
            setTags([...tags, tagInput]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleSubmit = (values: ProductInfo) => {
        onSubmit({ ...values, tags });
    };

    const handleJsonUpload = (file: UploadFile) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                form.setFieldsValue({
                    name: json.name || json.productName || '',
                    price: json.price || 0,
                    material: json.material || '',
                    color: json.color || '',
                    description: json.description || '',
                    category: json.category || json.mainCategory || '',
                });
                if (json.tags && Array.isArray(json.tags)) {
                    setTags(json.tags);
                }
                message.success('导入成功');
            } catch {
                message.error('JSON解析失败');
            }
        };
        reader.readAsText(file as unknown as Blob);
        return false;
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Text strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                    商品信息
                </Text>
                <Upload accept=".json" showUploadList={false} beforeUpload={handleJsonUpload}>
                    <Button type="text" icon={<UploadOutlined />} size="small" style={{ color: 'var(--text-secondary)' }}>
                        导入JSON
                    </Button>
                </Upload>
            </div>

            {/* 表单 */}
            <div style={{ padding: 16 }}>
                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ price: 0 }}>
                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>商品名称</span>}
                        name="name"
                        rules={[{ required: true, message: '请输入商品名称' }]}
                        style={{ marginBottom: 16 }}
                    >
                        <Input placeholder="例如：纯羊毛修身外套" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <Form.Item
                            label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>价格 (¥)</span>}
                            name="price"
                            rules={[{ required: true, message: '请输入价格' }]}
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="549" />
                        </Form.Item>

                        <Form.Item
                            label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>品类</span>}
                            name="category"
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="外套" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <Form.Item
                            label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>材质</span>}
                            name="material"
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="100%羊毛" />
                        </Form.Item>

                        <Form.Item
                            label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>颜色</span>}
                            name="color"
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="米色" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>商品描述</span>}
                        name="description"
                        style={{ marginBottom: 16 }}
                    >
                        <Input.TextArea rows={3} placeholder="商品的详细描述信息..." />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>标签</span>}
                        style={{ marginBottom: 20 }}
                    >
                        <div style={{ marginBottom: 8 }}>
                            {tags.map((tag) => (
                                <Tag
                                    key={tag}
                                    closable
                                    onClose={() => handleRemoveTag(tag)}
                                    style={{
                                        marginBottom: 4,
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-primary)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onPressEnter={handleAddTag}
                                placeholder="输入标签后按回车"
                                style={{ flex: 1 }}
                            />
                            <Button icon={<PlusOutlined />} onClick={handleAddTag}>
                                添加
                            </Button>
                        </div>
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
