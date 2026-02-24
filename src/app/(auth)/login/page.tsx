'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleSignUp = async () => {
    setStatus('loading');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('success');
      setMessage('Check your email to confirm your account.');
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('success');
      setMessage('Magic link sent. Check your inbox.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: '12px',
              fontSize: '20px',
              fontWeight: '700',
              color: '#0F1117',
              marginBottom: '16px',
            }}
          >
            VF
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>
            VaultFlow
          </h1>
          <p style={{ fontSize: '12px', color: '#484F58', marginTop: '4px', letterSpacing: '0.08em' }}>
            FINANCIAL OPERATIONS COCKPIT
          </p>
        </div>

        {/* Card */}
        <div className="glass-card">
          {/* Mode toggle */}
          <div
            style={{
              display: 'flex',
              background: '#0F1117',
              borderRadius: '6px',
              padding: '3px',
              marginBottom: '24px',
              border: '1px solid #21262D',
            }}
          >
            {(['password', 'magic'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '4px',
                  border: 'none',
                  background: mode === m ? '#10B981' : 'transparent',
                  color: mode === m ? '#0F1117' : '#8B949E',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  transition: 'all 120ms ease-out',
                }}
              >
                {m === 'password' ? 'Password' : 'Magic Link'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
            <div style={{ marginBottom: '16px' }}>
              <label className="vf-label">Email Address</label>
              <input
                className="vf-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="arjun@freelancer.dev"
                required
              />
            </div>

            {mode === 'password' && (
              <div style={{ marginBottom: '24px' }}>
                <label className="vf-label">Password</label>
                <input
                  className="vf-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {mode === 'magic' && <div style={{ marginBottom: '24px' }} />}

            {message && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background:
                    status === 'error'
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(16,185,129,0.1)',
                  color: status === 'error' ? '#EF4444' : '#10B981',
                  border:
                    status === 'error'
                      ? '1px solid rgba(239,68,68,0.2)'
                      : '1px solid rgba(16,185,129,0.2)',
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={status === 'loading'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {status === 'loading'
                ? 'Processing...'
                : mode === 'password'
                ? 'Sign In'
                : 'Send Magic Link'}
            </button>

            {mode === 'password' && (
              <button
                type="button"
                onClick={handleSignUp}
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              >
                Create Account
              </button>
            )}
          </form>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#484F58',
            marginTop: '24px',
            letterSpacing: '0.04em',
          }}
        >
          No bank sync. No social features. Just signal.
        </p>
      </div>
    </div>
  );
}
