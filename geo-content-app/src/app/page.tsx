'use client';

import React from 'react';
import { Card, Row, Col, Typography, Button } from 'antd';
import {
  EditOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* 欢迎区域 */}
      <div style={{ marginBottom: 40 }}>
        <Title
          level={2}
          style={{
            color: 'var(--text-primary)',
            marginBottom: 8,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          欢迎回来 👋
        </Title>
        <Paragraph
          style={{
            color: 'var(--text-secondary)',
            fontSize: 16,
            margin: 0,
          }}
        >
          导入商品信息，选择策略，一键生成专业内容
        </Paragraph>
      </div>

      {/* 快捷操作 */}
      <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
        <Col xs={24} md={12}>
          <Link href="/generate" style={{ display: 'block' }}>
            <Card
              hoverable
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <EditOutlined style={{ fontSize: 20, color: '#fff' }} />
                  </div>
                  <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, marginBottom: 8 }}>
                    创建内容
                  </Title>
                  <Paragraph style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
                    输入商品信息，选择生成策略
                  </Paragraph>
                </div>
                <ArrowRightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 18 }} />
              </div>
            </Card>
          </Link>
        </Col>

        <Col xs={24} md={12}>
          <Link href="/history" style={{ display: 'block' }}>
            <Card
              hoverable
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'var(--accent-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <FileTextOutlined style={{ fontSize: 20, color: '#fff' }} />
                  </div>
                  <Title level={4} style={{ color: 'var(--text-primary)', margin: 0, marginBottom: 8 }}>
                    历史记录
                  </Title>
                  <Paragraph style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
                    查看和管理已生成的内容
                  </Paragraph>
                </div>
                <ArrowRightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 18 }} />
              </div>
            </Card>
          </Link>
        </Col>
      </Row>

      {/* 功能介绍 */}
      <div style={{ marginBottom: 24 }}>
        <Title
          level={5}
          style={{
            color: 'var(--text-secondary)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          支持的生成策略
        </Title>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { name: '评测对比型', desc: '专业评测，竞品分析表格' },
          { name: '用户画像型', desc: '面向特定人群的购物指南' },
          { name: 'SMZDM深度评测', desc: '什么值得买平台风格' },
          { name: 'SMZDM短评测', desc: '简洁好物分享风格' },
        ].map((item, index) => (
          <Col xs={12} md={6} key={index}>
            <div
              style={{
                padding: 16,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary)',
                }}
              >
                {item.desc}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}
