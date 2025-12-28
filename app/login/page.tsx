import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Login',
};

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7fafc',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        padding: 24
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Hello 👋</h1>
        <p style={{ marginTop: 8, color: '#4a5568' }}>请登录继续</p>
        <form
          method="POST"
          action="/api/login"
          style={{ display: 'grid', gap: 12, marginTop: 16 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#4a5568' }}>邮箱</span>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                outline: 'none'
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#4a5568' }}>密码</span>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              style={{
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                outline: 'none'
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              marginTop: 6,
              padding: '10px 12px',
              background: '#111827',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            登录
          </button>
        </form>
        <div style={{ marginTop: 12, fontSize: 13, color: '#718096' }}>
          <span>没有账号？</span>{' '}
          <Link href="/" style={{ color: '#2563eb' }}>返回首页</Link>
        </div>
      </div>
    </div>
  );
}

