'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [taxRate, setTaxRate] = useState(30);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      tax_rate: taxRate,
      gst_enabled: gstEnabled,
      currency,
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('done');
      router.push('/');
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
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '32px', height: '32px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                color: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >VF</div>
            <span style={{ fontSize: '13px', color: '#8B949E' }}>VaultFlow</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#E6EDF3', margin: '0 0 8px' }}>
            Configure your pipeline
          </h1>
          <p style={{ fontSize: '13px', color: '#8B949E', margin: 0, lineHeight: 1.6 }}>
            Set once. Applied to all future income events automatically.
          </p>
        </div>

        <div className="glass-card">
          <form onSubmit={handleSubmit}>
            {/* Tax Rate */}
            <div style={{ marginBottom: '28px' }}>
              <label className="vf-label">Income Tax Rate</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <input
                  type="range"
                  min={5}
                  max={42}
                  step={1}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#10B981' }}
                />
                <span
                  style={{
                    fontSize: '20px', fontWeight: '700', color: '#10B981',
                    minWidth: '48px', textAlign: 'right',
                  }}
                >
                  {taxRate}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#484F58' }}>New Regime 5%</span>
                <span style={{ fontSize: '11px', color: '#484F58' }}>Old Reg Max 42%</span>
              </div>
              <p style={{ fontSize: '11px', color: '#484F58', marginTop: '8px' }}>
                Common: 30% for ₹10L+ income. Override per income event if needed.
              </p>
            </div>

            {/* Currency */}
            <div style={{ marginBottom: '24px' }}>
              <label className="vf-label">Base Currency</label>
              <select
                className="vf-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">₹ INR — Indian Rupee</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="EUR">€ EUR — Euro</option>
                <option value="GBP">£ GBP — British Pound</option>
              </select>
            </div>

            {/* GST */}
            <div style={{ marginBottom: '32px' }}>
              <label className="vf-label">GST Registration</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setGstEnabled(!gstEnabled)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                    background: gstEnabled ? '#10B981' : '#21262D', cursor: 'pointer',
                    position: 'relative', transition: 'background 200ms ease',
                  }}
                >
                  <div
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#E6EDF3', position: 'absolute', top: '3px',
                      left: gstEnabled ? '23px' : '3px', transition: 'left 200ms ease',
                    }}
                  />
                </button>
                <span style={{ fontSize: '13px', color: '#8B949E' }}>
                  {gstEnabled ? 'GST registered (18% applicable)' : 'Not GST registered'}
                </span>
              </div>
            </div>

            {message && (
              <div style={{
                marginBottom: '16px', padding: '10px 12px', borderRadius: '6px',
                fontSize: '12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={status === 'loading'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {status === 'loading' ? 'Saving...' : 'Launch Cockpit →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
