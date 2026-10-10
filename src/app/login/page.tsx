'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      });
      setPassword('');
      if (!response.ok) {
        setError(response.status === 503
          ? 'Đăng nhập chưa được cấu hình trên máy chủ.'
          : 'Mật khẩu không hợp lệ hoặc yêu cầu bị từ chối.');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ minHeight: '75vh', display: 'grid', placeItems: 'center', padding: '2rem',
      background: 'var(--washi-base, #FAF8F5)' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 420, padding: '2rem',
        border: '1px solid #DCD0BE', borderRadius: 14, background: '#fffdf9' }}>
        <h1 style={{ fontSize: '1.65rem', marginBottom: '0.75rem' }}>Kiokudo · Đăng nhập</h1>
        <p style={{ marginBottom: '1.5rem', color: '#685C4A' }}>
          Truy cập dữ liệu học tập cá nhân bằng mật khẩu chủ sở hữu.
        </p>
        <label htmlFor="owner-password" style={{ display: 'block', marginBottom: 8 }}>
          Mật khẩu
        </label>
        <input id="owner-password" type="password" autoComplete="current-password"
          required minLength={16} maxLength={256} value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: 12, border: '1px solid #AA9B87',
            borderRadius: 8, marginBottom: 14 }} />
        {error && <p role="alert" style={{ color: '#9B3434', marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={pending}
          style={{ padding: '0.75rem 1.5rem', borderRadius: 8,
            background: '#1B4268', color: 'white', cursor: 'pointer' }}>
          {pending ? 'Đang xác thực…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}
