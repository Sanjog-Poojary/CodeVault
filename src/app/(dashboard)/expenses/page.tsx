'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatINR, formatDate } from '@/lib/utils';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
  const [categorizing, setCategorizing] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted } = await supabase.from('expenses').insert({
      user_id: user.id,
      description: form.description,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      reviewed: false,
    }).select().single();

    setShowAdd(false);
    setForm({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0] });
    setExpenses((prev) => [inserted, ...prev]);

    // Auto-categorize via Grok
    if (inserted) {
      setCategorizing(inserted.id);
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description, amount: Number(form.amount), currency: 'INR' }),
      });
      const aiData = await res.json();
      const supabase2 = createClient();
      await supabase2.from('expenses').update({
        category: aiData.category,
        ai_confidence: aiData.confidence,
        is_deductible: aiData.is_deductible,
      }).eq('id', inserted.id);
      setCategorizing(null);
      loadExpenses();
    }
  };

  const reviewExpense = async (id: string, accept: boolean, category?: string) => {
    const supabase = createClient();
    await supabase.from('expenses').update({
      reviewed: true,
      ...(category ? { category } : {}),
    }).eq('id', id);
    loadExpenses();
  };

  const categoryColors: Record<string, string> = {
    Software: '#60A5FA', Hardware: '#A78BFA', Travel: '#F59E0B',
    Meals: '#FB7185', Marketing: '#10B981', Miscellaneous: '#6B7280',
  };

  const deductibleTotal = expenses.filter((e) => e.is_deductible).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>Expenses</h1>
          <p style={{ fontSize: '12px', color: '#484F58', marginTop: '4px' }}>
            {expenses.length} recorded · {formatINR(deductibleTotal)} deductible
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Expense
        </button>
      </div>

      {/* Add Expense Form */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '20px' }}>
            Add Expense
            <span style={{ marginLeft: '10px', fontSize: '11px', color: '#10B981', fontWeight: '400' }}>AI categorization via Grok will auto-run</span>
          </div>
          <form onSubmit={addExpense}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div><label className="vf-label">Description</label><input className="vf-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Adobe Creative Cloud - Monthly" required /></div>
              <div><label className="vf-label">Amount (₹)</label><input className="vf-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="3240" required /></div>
              <div><label className="vf-label">Date</label><input className="vf-input" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary">Add & Categorize</button>
              <button type="button" className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Expense List */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#484F58' }}>Loading...</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#484F58', fontSize: '13px' }}>No expenses yet. Add your first one.</div>
        ) : (
          <table className="audit-grid">
            <thead>
              <tr>
                <th style={{ padding: '14px 24px' }}>Description</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Category</th>
                <th>Confidence</th>
                <th>Deductible</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const isCategorizing = categorizing === exp.id;
                return (
                  <tr key={exp.id}>
                    <td style={{ padding: '12px 24px', maxWidth: '220px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</div>
                    </td>
                    <td style={{ fontSize: '11px', color: '#8B949E' }}>{formatDate(exp.expense_date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#E6EDF3' }}>{formatINR(exp.amount)}</td>
                    <td>
                      {isCategorizing ? (
                        <span style={{ fontSize: '11px', color: '#484F58', fontStyle: 'italic' }}>Grok analyzing...</span>
                      ) : exp.category ? (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: `${categoryColors[exp.category] || '#6B7280'}18`, color: categoryColors[exp.category] || '#6B7280', border: `1px solid ${categoryColors[exp.category] || '#6B7280'}33` }}>
                          {exp.category}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#484F58' }}>—</span>
                      )}
                    </td>
                    <td>
                      {exp.ai_confidence != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '40px', height: '3px', background: '#21262D', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${exp.ai_confidence * 100}%`, height: '100%', background: exp.ai_confidence > 0.7 ? '#10B981' : '#F59E0B' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: '#8B949E' }}>{Math.round(exp.ai_confidence * 100)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      {exp.is_deductible
                        ? <span style={{ fontSize: '11px', color: '#10B981' }}>✓ Yes</span>
                        : <span style={{ fontSize: '11px', color: '#484F58' }}>No</span>}
                    </td>
                    <td>
                      {!exp.reviewed && exp.category && !isCategorizing ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => reviewExpense(exp.id, true)} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', color: '#10B981', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>Accept</button>
                          <button onClick={() => reviewExpense(exp.id, false)} style={{ fontSize: '11px', padding: '2px 8px', background: '#161B22', border: '1px solid #21262D', borderRadius: '4px', color: '#8B949E', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>Override</button>
                        </div>
                      ) : exp.reviewed ? (
                        <span style={{ fontSize: '11px', color: '#484F58' }}>✓ Reviewed</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
