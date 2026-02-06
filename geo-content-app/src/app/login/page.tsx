'use client';

import React from 'react';
import { Card, Tabs, Form, Input, Button, Typography, message } from 'antd';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';

const { Title, Paragraph, Text } = Typography;

const API_BASE = '/api';

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/generate';

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/login`, values);
      message.success('登录成功');
      router.replace(nextPath);
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register`, values);
      message.success('注册申请已提交，等待管理员审批');
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4, color: 'var(--text-primary)' }}>
          登录
        </Title>
        <Paragraph style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
          需管理员审批后才能使用内容生成、历史记录与模板管理功能
        </Paragraph>
      </div>

      <Card
        styles={{ body: { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' } }}
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
      >
        <Tabs
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form layout="vertical" onFinish={handleLogin}>
                  <Form.Item
                    label={<Text style={{ color: 'var(--text-secondary)' }}>用户名</Text>}
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input autoComplete="username" />
                  </Form.Item>
                  <Form.Item
                    label={<Text style={{ color: 'var(--text-secondary)' }}>密码</Text>}
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block style={{ background: 'var(--accent-primary)' }}>
                    登录
                  </Button>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册申请',
              children: (
                <Form layout="vertical" onFinish={handleRegister}>
                  <Form.Item
                    label={<Text style={{ color: 'var(--text-secondary)' }}>用户名</Text>}
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少 3 个字符' }]}
                  >
                    <Input autoComplete="username" />
                  </Form.Item>
                  <Form.Item
                    label={<Text style={{ color: 'var(--text-secondary)' }}>密码</Text>}
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '至少 8 位' }]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block style={{ background: 'var(--accent-primary)' }}>
                    提交申请
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

