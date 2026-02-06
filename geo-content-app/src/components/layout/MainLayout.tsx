'use client';

import React from 'react';
import { Layout, Menu, ConfigProvider, theme as antTheme, Button, Tooltip } from 'antd';
import {
    HomeOutlined,
    EditOutlined,
    HistoryOutlined,
    SettingOutlined,
    UserOutlined,
    SunOutlined,
    MoonOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import axios from 'axios';
import { AccountMenu } from '@/components/account/AccountMenu';

const { Header, Content, Sider } = Layout;

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = React.useState<{ id: string; username: string; role: 'admin' | 'user' } | null>(null);

    React.useEffect(() => {
        let mounted = true;
        axios
            .get('/api/auth/me', { validateStatus: () => true })
            .then((res) => {
                if (!mounted) return;
                if (res.status >= 400) {
                    setUser(null);
                    return;
                }
                setUser(res.data.user || null);
            })
            .catch(() => {
                if (!mounted) return;
                setUser(null);
            });
        return () => {
            mounted = false;
        };
    }, [pathname]);

    const menuItems = [
        {
            key: '/',
            icon: <HomeOutlined />,
            label: <Link href="/">首页</Link>,
        },
        {
            key: '/generate',
            icon: <EditOutlined />,
            label: <Link href="/generate">内容生成</Link>,
        },
        {
            key: '/history',
            icon: <HistoryOutlined />,
            label: <Link href="/history">历史记录</Link>,
        },
        {
            key: '/templates',
            icon: <SettingOutlined />,
            label: <Link href="/templates">模板管理</Link>,
        },
        ...(user?.role === 'admin'
            ? [
                  {
                      key: '/admin',
                      icon: <UserOutlined />,
                      label: <Link href="/admin">账号审批</Link>,
                  },
              ]
            : []),
    ];

    const pageTitles: Record<string, string> = {
        '/': '工作台',
        '/generate': '创建内容',
        '/history': '历史记录',
        '/templates': '模板配置',
        '/admin': '账号审批',
        '/login': '登录',
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
                token: {
                    colorPrimary: '#d97706',
                    colorBgContainer: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                    colorBgElevated: theme === 'dark' ? '#2a2a2a' : '#ffffff',
                    colorBorder: theme === 'dark' ? '#333333' : '#e8e6e3',
                    colorText: theme === 'dark' ? '#f0f0f0' : '#1a1a1a',
                    colorTextSecondary: theme === 'dark' ? '#a0a0a0' : '#5c5c5c',
                    borderRadius: 10,
                    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
                <Sider
                    width={220}
                    style={{
                        background: 'var(--bg-secondary)',
                        borderRight: '1px solid var(--border-primary)',
                    }}
                >
                    {/* Logo区域 */}
                    <div
                        style={{
                            padding: '24px 20px',
                            borderBottom: '1px solid var(--border-primary)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 14,
                                }}
                            >
                                G
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    GEO Content
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    内容工作台
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 导航菜单 */}
                    <Menu
                        mode="inline"
                        selectedKeys={[pathname]}
                        items={menuItems}
                        style={{
                            background: 'transparent',
                            borderRight: 'none',
                            padding: '12px 8px',
                        }}
                    />
                </Sider>

                <Layout>
                    {/* 顶部栏 */}
                    <Header
                        style={{
                            background: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border-primary)',
                            padding: '0 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: 56,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {pageTitles[pathname] || ''}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tooltip title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
                                <Button
                                    type="text"
                                    icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                                    onClick={toggleTheme}
                                    style={{
                                        color: 'var(--text-secondary)',
                                        width: 36,
                                        height: 36,
                                    }}
                                />
                            </Tooltip>
                            <AccountMenu activeUser={user} onActiveUserChange={setUser} />
                        </div>
                    </Header>

                    {/* 内容区 */}
                    <Content
                        style={{
                            padding: 24,
                            background: 'var(--bg-primary)',
                            minHeight: 'calc(100vh - 56px)',
                            overflow: 'auto',
                        }}
                    >
                        <div className="animate-fade-in">{children}</div>
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
}
