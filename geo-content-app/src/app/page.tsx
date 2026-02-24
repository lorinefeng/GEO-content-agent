'use client';

import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { EditOutlined, FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
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
          在SKU模式与品牌IP模式下生成对比评测内容
        </Paragraph>
      </div>

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
                    选择SKU或品牌IP模式，生成对比评测
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
                    按SKU与品牌IP分栏管理已生成内容
                  </Paragraph>
                </div>
                <ArrowRightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 18 }} />
              </div>
            </Card>
          </Link>
        </Col>
      </Row>

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
          当前策略
        </Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              SKU对比评测
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              面向商品规格、价格带与竞品特征的评测内容
            </div>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              品牌IP对比评测
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              面向企业品牌定位、行业特征与竞品关系的评测内容
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
