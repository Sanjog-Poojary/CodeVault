'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatINR } from '@/lib/utils';

export default function SettingsPage() {
  const [taxRate, setTaxRate] = useState(30);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [bills, setBills] = useState<any[]>([]);
  const [newBill, setNewBill] = useState({ name: '', amount: '', frequency: 'MONTHLY' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: u } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (u) { setTaxRate(u.tax_rate); setGstEnabled(u.gst_enabled); setCurrency(u.currency); }
    const { data: b } = await supabase.from('committed_bills').select('*').eq('user_id', user.id).eq('active', true);
    setBills(b || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('users').upsert({ id: user.id, tax_rate: taxRate, gst_enabled: gstEnabled, currency });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    await supabase.from('committed_bills').insert({ user_id: user.id, name: newBill.name, amount: Number(newBill.amount), frequency: newBill.frequency, next_due: next.toISOString().split('T')[0], active: true });
    setNewBill({ name: '', amount: '', frequency: 'MONTHLY' });
    load();
  };

  const deactivateBill = async (id: string) => {
    const supabase = createClient();
    await supabase.from('committed_bills').update({ active: false }).eq('id', id);
    load();
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '12px', color: '#484F58', marginTop: '4px' }}>Configure your pipeline parameters</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Tax Config */}
        <div className="glass-card">
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '24px' }}>Tax Configuration</div>

          <div style={{ marginBottom: '28px' }}>
            <label className="vf-label">Income Tax Rate</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <input type="range" min={5} max={42} step={1} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} style={{ flex: 1, accentColor: '#10B981' }} />
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#10B981', minWidth: '42px', textAlign: 'right' }}>{taxRate}%</span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="vf-label">Base Currency</label>
            <select className="vf-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label className="vf-label">GST Registration</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setGstEnabled(!gstEnabled)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', background: gstEnabled ? '#10B981' : '#21262D', cursor: 'pointer', position: 'relative', transition: 'background 200ms ease' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#E6EDF3', position: 'absolute', top: '3px', left: gstEnabled ? '23px' : '3px', transition: 'left 200ms ease' }} />
              </button>
              <span style={{ fontSize: '13px', color: '#8B949E' }}>{gstEnabled ? 'GST registered' : 'Not registered'}</span>
            </div>
          </div>

          <button className="btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>

        {/* Committed Bills */}
        <div className="glass-card">
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '4px' }}>Committed Bills</div>
          <div style={{ fontSize: '11px', color: '#484F58', marginBottom: '20px' }}>Deducted from Real Balance automatically</div>

          {/* Add Bill Form */}
          <form onSubmit={addBill} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label className="vf-label">Name</label>
                <input className="vf-input" value={newBill.name} onChange={(e) => setNewBill({ ...newBill, name: e.target.value })} placeholder="Figma, AWS..." required />
              </div>
              <div style={{ width: '80px' }}>
                <label className="vf-label">₹/mo</label>
                <input className="vf-input" type="number" value={newBill.amount} onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })} placeholder="999" required />
              </div>
              <button type="submit" className="btn-primary" style={{ height: '38px', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
          </form>

          {/* Bills List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bills.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#484F58' }}>No committed bills</p>
            ) : (
              <>
                {bills.map((bill) => (
                  <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #21262D' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#E6EDF3' }}>{bill.name}</div>
                      <div style={{ fontSize: '10px', color: '#484F58', marginTop: '2px' }}>{bill.frequency}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#EF4444' }}>−{formatINR(bill.amount)}</span>
                      <button onClick={() => deactivateBill(bill.id)} style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }} title="Remove">×</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', fontSize: '12px', fontWeight: '700' }}>
                  <span style={{ color: '#8B949E' }}>Monthly Total</span>
                  <span style={{ color: '#EF4444' }}>{formatINR(bills.reduce((s, b) => s + Number(b.amount), 0))}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
