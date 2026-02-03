'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Button, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface MarkdownPreviewProps {
    content: string;
    showCopyButton?: boolean;
}

export default function MarkdownPreview({ content, showCopyButton = true }: MarkdownPreviewProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            message.success('已复制到剪贴板');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error('复制失败');
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {showCopyButton && (
                <Button
                    type="text"
                    icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={handleCopy}
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        zIndex: 10,
                        color: copied ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
                    }}
                >
                    {copied ? '已复制' : '复制'}
                </Button>
            )}
            <div className="markdown-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
