'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import { formatINR, formatDate, daysSince } from '@/lib/utils';
import Link from 'next/link';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [followup, setFollowup] = useState<{ text: string; loading: boolean; invoiceId: string | null }>({ text: '', loading: false, invoiceId: null });

  // New invoice form state
  const [form, setForm] = useState({ client_name: '', amount: '', due_date: '', currency: 'INR', description: '' });

  const loadInvoices = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const count = invoices.length + 1;
    const invoice_ref = `VF-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    await supabase.from('invoices').insert({ ...form, amount: Number(form.amount), user_id: user.id, invoice_ref, status: 'DRAFT' });
    setShowCreate(false);
    setForm({ client_name: '', amount: '', due_date: '', currency: 'INR', description: '' });
    loadInvoices();
  };

  const markPaid = async (inv: any) => {
    const supabase = createClient();
    await supabase.from('invoices').update({ status: 'PAID', paid_date: new Date().toISOString().split('T')[0] }).eq('id', inv.id);
    // Trigger income pipeline
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase.from('users').select('tax_rate').eq('id', user.id).single();
      const taxRate = userData?.tax_rate ?? 30;
      const taxSlice = Math.round(inv.amount * (taxRate / 100) * 100) / 100;
      const netAmount = inv.amount - taxSlice;
      await supabase.from('income_events').insert({ user_id: user.id, amount: inv.amount, tax_slice: taxSlice, net_amount: netAmount, client_name: inv.client_name, description: `Invoice ${inv.invoice_ref}`, event_date: new Date().toISOString().split('T')[0] });
    }
    loadInvoices();
  };

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient();
    await supabase.from('invoices').update({ status }).eq('id', id);
    loadInvoices();
  };

  const draftFollowup = async (inv: any) => {
    setFollowup({ text: '', loading: true, invoiceId: inv.id });
    const res = await fetch('/api/ai/invoices/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: inv.client_name, invoiceRef: inv.invoice_ref, amount: inv.amount, dueDate: inv.due_date, daysPastDue: daysSince(inv.due_date) }),
    });
    const data = await res.json();
    setFollowup({ text: data.draft, loading: false, invoiceId: inv.id });
  };

  const agingStyle = (inv: any) => {
    const days = daysSince(inv.due_date);
    if (inv.status === 'PAID') return { color: '#10B981' };
    if (days > 30) return { color: '#EF4444' };
    if (days > 15) return { color: '#F59E0B' };
    return { color: '#8B949E' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>Invoices</h1>
          <p style={{ fontSize: '12px', color: '#484F58', marginTop: '4px' }}>
            {invoices.filter((i) => i.status !== 'PAID').length} open · {invoices.filter((i) => i.status === 'OVERDUE').length} overdue
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Invoice
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '20px' }}>New Invoice</div>
          <form onSubmit={createInvoice}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div><label className="vf-label">Client</label><input className="vf-input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Acme Corp" required /></div>
              <div><label className="vf-label">Amount (₹)</label><input className="vf-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="50000" required /></div>
              <div><label className="vf-label">Due Date</label><input className="vf-input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required /></div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="vf-label">Description</label>
              <input className="vf-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Website redesign — Phase 2" />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary">Create Invoice</button>
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#484F58' }}>Loading...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#484F58', fontSize: '13px' }}>No invoices yet. Create your first one.</div>
        ) : (
          <table className="audit-grid" style={{ padding: 0 }}>
            <thead>
              <tr style={{ padding: '0 24px' }}>
                <th style={{ padding: '14px 24px' }}>Client</th>
                <th>Ref</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Due Date</th>
                <th>Age</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const age = daysSince(inv.due_date);
                return (
                  <>
                    <tr key={inv.id}>
                      <td style={{ padding: '12px 24px', fontWeight: '500' }}>{inv.client_name}</td>
                      <td style={{ fontSize: '11px', color: '#8B949E' }}>{inv.invoice_ref}</td>
                      <td style={{ textAlign: 'right', ...agingStyle(inv), fontWeight: '600' }}>{formatINR(inv.amount)}</td>
                      <td style={{ fontSize: '12px', color: '#8B949E' }}>{formatDate(inv.due_date)}</td>
                      <td style={{ fontSize: '12px', ...agingStyle(inv) }}>{inv.status === 'PAID' ? '—' : `${age}d`}</td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {inv.status !== 'PAID' && (
                            <>
                              {inv.status === 'DRAFT' && (
                                <button onClick={() => updateStatus(inv.id, 'SENT')} style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '4px', color: '#60A5FA', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                                  Mark Sent
                                </button>
                              )}
                              {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                                <>
                                  <button onClick={() => markPaid(inv)} style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', color: '#10B981', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                                    Mark Paid
                                  </button>
                                  <button onClick={() => updateStatus(inv.id, 'OVERDUE')} style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', color: '#F59E0B', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                                    Flag Overdue
                                  </button>
                                  <button onClick={() => draftFollowup(inv)} style={{ fontSize: '11px', padding: '3px 8px', background: '#161B22', border: '1px solid #21262D', borderRadius: '4px', color: '#8B949E', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {followup.loading && followup.invoiceId === inv.id ? '...' : 'Draft Follow-up'}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {followup.text && followup.invoiceId === inv.id && (
                      <tr key={`followup-${inv.id}`}>
                        <td colSpan={7} style={{ padding: '0 24px 16px' }}>
                          <div style={{ background: '#0F1117', border: '1px solid #21262D', borderRadius: '8px', padding: '14px', fontSize: '12px', color: '#8B949E', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            <div style={{ fontSize: '10px', color: '#484F58', marginBottom: '8px', letterSpacing: '0.06em' }}>AI-DRAFTED FOLLOW-UP (GROK)</div>
                            {followup.text}
                            <button onClick={() => { navigator.clipboard.writeText(followup.text); }} style={{ marginTop: '10px', display: 'block', fontSize: '11px', padding: '4px 10px', background: 'transparent', border: '1px solid #21262D', borderRadius: '4px', color: '#8B949E', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                              Copy to clipboard
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
