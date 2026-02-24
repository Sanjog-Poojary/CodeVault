'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatINR, formatDate } from '@/lib/utils';

export default function TaxVaultPage() {
  const [slices, setSlices] = useState<any[]>([]);
  const [deductibles, setDeductibles] = useState<any[]>([]);
  const [totalTax, setTotalTax] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: income } = await supabase.from('income_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const { data: expenses } = await supabase.from('expenses').select('*').eq('user_id', user.id).eq('is_deductible', true);
    setSlices(income || []);
    setDeductibles(expenses || []);
    setTotalTax((income || []).reduce((s: number, e: any) => s + Number(e.tax_slice), 0));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalDeductible = deductibles.reduce((s, e) => s + Number(e.amount), 0);
  const estimatedTaxSaving = totalDeductible * 0.30;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>Tax Vault</h1>
        <p style={{ fontSize: '12px', color: '#484F58', marginTop: '4px' }}>Automatically withheld from every income event</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'TAX RESERVED', value: totalTax, color: '#F59E0B', sub: 'Total withheld' },
          { label: 'DEDUCTIBLE EXPENSES', value: totalDeductible, color: '#10B981', sub: `${deductibles.length} items` },
          { label: 'EST. TAX SAVING', value: estimatedTaxSaving, color: '#60A5FA', sub: 'At 30% rate' },
        ].map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '500', color: '#484F58', letterSpacing: '0.08em', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>
              {formatINR(card.value)}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Tax Slice History */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '16px' }}>Tax Slice History</div>
          {loading ? (
            <p style={{ color: '#484F58', fontSize: '12px' }}>Loading...</p>
          ) : slices.length === 0 ? (
            <p style={{ color: '#484F58', fontSize: '12px' }}>No income events yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {slices.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #21262D' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#E6EDF3' }}>{ev.client_name || 'Income Event'}</div>
                    <div style={{ fontSize: '11px', color: '#484F58', marginTop: '2px' }}>{formatDate(ev.event_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: '600' }}>
                      {formatINR(ev.tax_slice)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#484F58', marginTop: '2px' }}>
                      of {formatINR(ev.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deductible Expenses */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '16px' }}>
            Deductible Expenses
            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#10B981', fontWeight: '400' }}>AI-identified</span>
          </div>
          {deductibles.length === 0 ? (
            <p style={{ color: '#484F58', fontSize: '12px' }}>No deductible expenses found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {deductibles.map((exp) => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #21262D' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#E6EDF3' }}>{exp.description}</div>
                    <div style={{ fontSize: '11px', color: '#10B981', marginTop: '2px' }}>{exp.category}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#E6EDF3', fontWeight: '600' }}>{formatINR(exp.amount)}</div>
                </div>
              ))}
              <div style={{ paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700' }}>
                <span style={{ color: '#8B949E' }}>Total Deductible</span>
                <span style={{ color: '#10B981' }}>{formatINR(totalDeductible)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
