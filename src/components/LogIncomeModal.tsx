'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateTaxSlice, calculateNetAmount } from '@/lib/tax';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogIncomeModal({ onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxOverride, setTaxOverride] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user tax rate
    const { data: userData } = await supabase.from('users').select('tax_rate').eq('id', user.id).single();
    const taxRate = taxOverride ? Number(taxOverride) : (userData?.tax_rate ?? 30);

    const amountNum = Number(amount);
    const taxSlice = calculateTaxSlice(amountNum, taxRate);
    const netAmount = calculateNetAmount(amountNum, taxRate);

    const { error } = await supabase.from('income_events').insert({
      user_id: user.id,
      amount: amountNum,
      tax_slice: taxSlice,
      net_amount: netAmount,
      client_name: clientName,
      description,
      event_date: eventDate,
    });

    if (!error) {
      setStatus('done');
      setTimeout(onSuccess, 400);
    } else {
      setStatus('idle');
      alert(error.message);
    }
  };

  const amountNum = Number(amount) || 0;
  const previewTax = amountNum > 0 ? calculateTaxSlice(amountNum, Number(taxOverride) || 30) : 0;
  const previewNet = amountNum - previewTax;

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
              <input className="vf-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="80000" required min="1" />
            </div>
            <div>
              <label className="vf-label">Date</label>
              <input className="vf-input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="vf-label">Client Name</label>
            <input className="vf-input" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="vf-label">Description</label>
            <input className="vf-input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Website redesign — Phase 1" />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="vf-label">Tax Rate Override (optional)</label>
            <input className="vf-input" type="number" value={taxOverride} onChange={(e) => setTaxOverride(e.target.value)} placeholder="30 (uses profile default)" min="0" max="60" />
          </div>

          {/* Pipeline Preview */}
          {amountNum > 0 && (
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
