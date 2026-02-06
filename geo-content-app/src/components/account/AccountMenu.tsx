'use client';

import React from 'react';
import { Avatar, Button, Divider, Form, Input, Modal, Popover, Select, Space, Tag, Typography, message } from 'antd';
import {
  CheckOutlined,
  LogoutOutlined,
  PlusOutlined,
  SwapOutlined,
  UserOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type AuthUser = { id: string; username: string; role: 'admin' | 'user' };

type AccountsResponse = {
  activeUser: AuthUser | null;
  accounts: AuthUser[];
};

const { Text } = Typography;

function roleLabel(role: AuthUser['role']) {
  return role === 'admin' ? '管理员' : '用户';
}

function roleColor(role: AuthUser['role']) {
  return role === 'admin' ? 'gold' : 'default';
}

export function AccountMenu(props: { activeUser: AuthUser | null; onActiveUserChange: (u: AuthUser | null) => void }) {
  const { activeUser, onActiveUserChange } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [accounts, setAccounts] = React.useState<AuthUser[]>([]);
  const [addAccountOpen, setAddAccountOpen] = React.useState(false);
  const [createUserOpen, setCreateUserOpen] = React.useState(false);

  const [addForm] = Form.useForm<{ username: string; password: string }>();
  const [createForm] = Form.useForm<{ username: string; password?: string; role?: 'user' | 'admin' }>();

  const nextPath = searchParams.get('next') || '/generate';

  const refreshAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<AccountsResponse>('/api/auth/accounts', { validateStatus: () => true });
      if (res.status >= 400) {
        setAccounts([]);
        onActiveUserChange(null);
        return;
      }
      setAccounts(res.data.accounts || []);
      onActiveUserChange(res.data.activeUser || null);
    } catch {
      setAccounts([]);
      onActiveUserChange(null);
    } finally {
      setLoading(false);
    }
  }, [onActiveUserChange]);

  React.useEffect(() => {
    if (!open) return;
    refreshAccounts();
  }, [open, refreshAccounts]);

  const handleSwitch = async (userId: string) => {
    try {
      const res = await axios.post('/api/auth/switch', { userId });
      const user = res.data.user as AuthUser | undefined;
      if (user) onActiveUserChange(user);
      message.success('已切换账号');
      await refreshAccounts();
      if (pathname === '/login') router.replace(nextPath);
      else router.refresh();
      setOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '切换失败');
    }
  };

  const handleLogout = async (all: boolean) => {
    try {
      await axios.post('/api/auth/logout', all ? { all: true } : {});
    } finally {
      onActiveUserChange(null);
      await refreshAccounts();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      setOpen(false);
    }
  };

  const handleAddAccount = async (values: { username: string; password: string }) => {
    try {
      await axios.post('/api/auth/login', values);
      message.success('已添加账号');
      addForm.resetFields();
      setAddAccountOpen(false);
      await refreshAccounts();
      if (pathname === '/login') router.replace(nextPath);
      else router.refresh();
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '登录失败');
    }
  };

  const handleCreateUser = async (values: { username: string; password?: string; role?: 'user' | 'admin' }) => {
    try {
      const res = await axios.post('/api/admin/users', values);
      const pwd = typeof res.data.password === 'string' ? res.data.password : '';
      if (pwd) {
        Modal.success({
          title: '子账号已创建',
          content: (
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>请复制给同事（只显示一次）</div>
              <div style={{ padding: 12, border: '1px solid var(--border-primary)', borderRadius: 10, background: 'var(--bg-tertiary)' }}>
                <div>
                  <Text style={{ color: 'var(--text-secondary)' }}>用户名：</Text>
                  <Text strong style={{ color: 'var(--text-primary)' }}>
                    {values.username}
                  </Text>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Text style={{ color: 'var(--text-secondary)' }}>密码：</Text>
                  <Text strong style={{ color: 'var(--text-primary)' }}>
                    {pwd}
                  </Text>
                </div>
              </div>
            </div>
          ),
          okText: '知道了',
        });
      } else {
        message.success('子账号已创建');
      }
      createForm.resetFields();
      setCreateUserOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const serverMessage = typeof e?.response?.data?.error === 'string' ? e.response.data.error : '';
      message.error(serverMessage || '创建失败');
    }
  };

  const content = (
    <div className="geo-account-panel" style={{ width: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            icon={<UserOutlined />}
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
          />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>
                {activeUser ? activeUser.username : '未登录'}
              </Text>
              {activeUser && <Tag color={roleColor(activeUser.role)} style={{ marginInlineEnd: 0 }}>{roleLabel(activeUser.role)}</Tag>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {activeUser ? '会话已就绪，可切换或登出' : '可在此添加账号或切换已有账号'}
            </div>
          </div>
        </div>
        <Button
          size="small"
          type="text"
          icon={<PlusOutlined />}
          onClick={() => setAddAccountOpen(true)}
          style={{ color: 'var(--text-secondary)' }}
        >
          添加
        </Button>
      </div>

      <Divider style={{ margin: '12px 0', borderColor: 'var(--border-primary)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 12, letterSpacing: 0.3 }}>账号切换</Text>
        {loading && <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>加载中...</Text>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {accounts.length === 0 ? (
          <div
            style={{
              padding: '10px 12px',
              border: '1px dashed var(--border-primary)',
              borderRadius: 12,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-primary)',
              fontSize: 13,
            }}
          >
            暂无可切换账号
          </div>
        ) : (
          accounts.map((u) => {
            const isActive = !!activeUser && u.id === activeUser.id;
            return (
              <Button
                key={u.id}
                type="text"
                onClick={() => handleSwitch(u.id)}
                disabled={isActive}
                style={{
                  textAlign: 'left',
                  height: 'auto',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                  background: isActive ? 'rgba(217,119,6,0.08)' : 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar
                    size={30}
                    icon={<UserOutlined />}
                    style={{
                      background: isActive ? 'rgba(217,119,6,0.12)' : 'var(--bg-tertiary)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  />
                  <div style={{ lineHeight: 1.15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: 'var(--text-primary)' }}>{u.username}</Text>
                      <Tag color={roleColor(u.role)} style={{ marginInlineEnd: 0 }}>
                        {roleLabel(u.role)}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {isActive ? '当前使用中' : '点击切换'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
                  {isActive ? <CheckOutlined /> : <SwapOutlined />}
                </div>
              </Button>
            );
          })
        )}
      </div>

      {activeUser?.role === 'admin' && (
        <>
          <Divider style={{ margin: '12px 0', borderColor: 'var(--border-primary)' }} />
          <Button
            type="text"
            icon={<UserAddOutlined />}
            onClick={() => setCreateUserOpen(true)}
            style={{
              width: '100%',
              textAlign: 'left',
              height: 40,
              borderRadius: 12,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            创建子账号
          </Button>
        </>
      )}

      <Divider style={{ margin: '12px 0', borderColor: 'var(--border-primary)' }} />

      <Space style={{ width: '100%' }} direction="vertical" size={8}>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={() => handleLogout(false)}
          disabled={!activeUser}
          style={{ width: '100%', borderRadius: 12 }}
        >
          退出登录
        </Button>
        <Button
          icon={<LogoutOutlined />}
          onClick={() => handleLogout(true)}
          style={{ width: '100%', borderRadius: 12 }}
        >
          退出所有账号
        </Button>
      </Space>
    </div>
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomRight"
        arrow={false}
        content={content}
        overlayInnerStyle={{
          padding: 12,
          borderRadius: 14,
          border: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <Button
          type="text"
          aria-label="账号管理"
          style={{
            width: 36,
            height: 36,
            padding: 0,
            borderRadius: 999,
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Avatar
            size={28}
            icon={<UserOutlined />}
            style={{
              background: activeUser ? 'rgba(217,119,6,0.12)' : 'var(--bg-tertiary)',
              color: activeUser ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          />
        </Button>
      </Popover>

      <Modal
        title="添加账号"
        open={addAccountOpen}
        onCancel={() => setAddAccountOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddAccount}>
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
          <Button type="primary" htmlType="submit" block style={{ background: 'var(--accent-primary)' }}>
            登录并添加
          </Button>
        </Form>
      </Modal>

      <Modal
        title="创建子账号"
        open={createUserOpen}
        onCancel={() => setCreateUserOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateUser} initialValues={{ role: 'user' }}>
          <Form.Item
            label={<Text style={{ color: 'var(--text-secondary)' }}>用户名</Text>}
            name="username"
            rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少 3 个字符' }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>密码（留空自动生成）</Text>} name="password">
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label={<Text style={{ color: 'var(--text-secondary)' }}>角色</Text>} name="role">
            <Select
              options={[
                { value: 'user', label: '用户' },
                { value: 'admin', label: '管理员' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: 'var(--accent-primary)' }}>
            创建
          </Button>
        </Form>
      </Modal>
    </>
  );
}

