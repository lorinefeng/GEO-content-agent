'use client';

import React from 'react';
import { Table, Button, Space, Typography, message, Popconfirm, Tag, Empty, Spin } from 'antd';
import axios from 'axios';
import { useRequireAuth } from '@/lib/useRequireAuth';

const { Text } = Typography;

type RegistrationRequest = {
  id: string;
  username: string;
  requested_at: string;
};

const API_BASE = '/api';

export default function AdminPage() {
  const { loading: authLoading } = useRequireAuth({ admin: true });
  const [loading, setLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<RegistrationRequest[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/registration-requests`);
      setRequests(res.data.requests || []);
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '获取注册申请失败');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRequests();
  }, []);

  const approve = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/admin/registration-requests/${id}/approve`);
      message.success('已批准');
      fetchRequests();
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '操作失败');
    }
  };

  const reject = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/admin/registration-requests/${id}/reject`);
      message.success('已拒绝');
      fetchRequests();
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '操作失败');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {authLoading ? (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ color: 'var(--text-secondary)', marginTop: 16 }}>正在校验登录状态...</div>
        </div>
      ) : (
        <>
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>
          注册审批
        </Text>
        <Tag color="gold" style={{ marginLeft: 8 }}>
          管理员
        </Tag>
      </div>

      {requests.length === 0 && !loading ? (
        <Empty description={<span style={{ color: 'var(--text-tertiary)' }}>暂无待审批申请</span>} style={{ padding: 60 }} />
      ) : (
        <Table
          rowKey="id"
          loading={loading}
          dataSource={requests}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: '用户名',
              dataIndex: 'username',
              key: 'username',
              render: (v: string) => <Text style={{ color: 'var(--text-primary)' }}>{v}</Text>,
            },
            {
              title: '申请时间',
              dataIndex: 'requested_at',
              key: 'requested_at',
              width: 180,
              render: (v: string) => (
                <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(v).toLocaleString('zh-CN')}</Text>
              ),
            },
            {
              title: '操作',
              key: 'action',
              width: 180,
              render: (_: unknown, record: RegistrationRequest) => (
                <Space>
                  <Button type="primary" onClick={() => approve(record.id)} style={{ background: 'var(--accent-primary)' }}>
                    批准
                  </Button>
                  <Popconfirm title="确认拒绝该申请？" okText="拒绝" cancelText="取消" onConfirm={() => reject(record.id)}>
                    <Button danger>拒绝</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}
        </>
      )}
    </div>
  );
}
