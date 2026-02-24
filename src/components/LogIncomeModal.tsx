'use client';

import { useState } from 'react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { calculateTaxSlice, calculateNetAmount } from '@/lib/tax';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// ── Validation schema ─────────────────────────────────────
const IncomeEventSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .max(100_000_000, 'Amount exceeds maximum'),
  eventDate: z.string().refine((d) => {
    const date = new Date(d);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date <= tomorrow;
  }, 'Event date cannot be in the future'),
  clientName: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  taxRate: z.number().min(0).max(60),
});

// Float-safe 2dp rounding — prevents JS binary float errors
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function LogIncomeModal({ onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxOverride, setTaxOverride] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // ── Client-side Zod validation ────────────────────────
    const parsed = IncomeEventSchema.safeParse({
      amount: Number(amount),
      eventDate,
      clientName: clientName || undefined,
      description: description || undefined,
      taxRate: taxOverride ? Number(taxOverride) : 30,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Validation error');
      return;
    }

    setStatus('loading');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setStatus('idle'); return; }

    const { data: userData } = await supabase.from('users').select('tax_rate').eq('id', user.id).single();
    const taxRate = taxOverride ? Number(taxOverride) : (userData?.tax_rate ?? 30);

    // Float-safe arithmetic — all values rounded to 2dp before DB insert
    const amountNum = r2(Number(amount));
    const taxSlice  = r2(calculateTaxSlice(amountNum, taxRate));
    const netAmount = r2(amountNum - taxSlice);

    const { error: dbError } = await supabase.from('income_events').insert({
      user_id: user.id,
      amount: amountNum,
      tax_slice: taxSlice,
      net_amount: netAmount,
      client_name: clientName.trim() || null,
      description: description.trim() || null,
      event_date: eventDate,
    });

    if (!dbError) {
      setStatus('done');
      setTimeout(onSuccess, 400);
    } else {
      setStatus('idle');
      setError(dbError.message);
    }
  };

  const amountNum = r2(Number(amount) || 0);
  const effectiveTaxRate = Number(taxOverride) || 30;
  const previewTax = amountNum > 0 ? r2(calculateTaxSlice(amountNum, effectiveTaxRate)) : 0;
  const previewNet = r2(amountNum - previewTax);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#161B22', border: '1px solid #21262D', borderRadius: '12px',
          padding: '28px', width: '100%', maxWidth: '440px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>Log Income Event</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: '18px' }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="vf-label">Amount (₹)</label>
              <input className="vf-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="80000" required min="1" max="100000000" />
            </div>
            <div>
              <label className="vf-label">Date</label>
              <input className="vf-input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="vf-label">Client Name</label>
            <input className="vf-input" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" maxLength={200} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="vf-label">Description</label>
            <input className="vf-input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Website redesign — Phase 1" maxLength={500} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="vf-label">Tax Rate Override (optional)</label>
            <input className="vf-input" type="number" value={taxOverride} onChange={(e) => setTaxOverride(e.target.value)} placeholder="30 (uses profile default)" min="0" max="60" />
          </div>

          {/* Inline validation error — no alert() */}
          {error && (
            <div style={{
              marginBottom: '16px', padding: '10px 12px', borderRadius: '6px',
              fontSize: '12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </div>
          )}

          {/* Pipeline Preview */}
          {amountNum > 0 && !error && (
            <div style={{
              background: '#0F1117', border: '1px solid #21262D', borderRadius: '8px',
              padding: '14px', marginBottom: '20px', fontSize: '12px',
            }}>
              <div style={{ color: '#8B949E', marginBottom: '8px', fontSize: '10px', letterSpacing: '0.06em' }}>
                PIPELINE PREVIEW
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#8B949E' }}>Gross</span>
                <span style={{ color: '#E6EDF3' }}>₹{amountNum.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#8B949E' }}>→ Tax Vault</span>
                <span style={{ color: '#F59E0B' }}>₹{previewTax.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #21262D', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#8B949E', fontWeight: '600' }}>Net to Balance</span>
                <span style={{ color: '#10B981', fontWeight: '700' }}>₹{previewNet.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={status === 'loading'}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {status === 'loading' ? 'Processing...' : status === 'done' ? '✓ Logged' : 'Run Pipeline →'}
          </button>
        </form>
      </div>
    </div>
  );
}
