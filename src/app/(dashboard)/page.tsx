'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Odometer from '@/components/Odometer';
import Sparkline from '@/components/Sparkline';
import StatusBadge from '@/components/StatusBadge';
import { formatINR, formatDate, daysSince, agingColor } from '@/lib/utils';
import { useFinancialStore } from '@/stores/useFinancialStore';
import LogIncomeModal from '@/components/LogIncomeModal';

interface TaxSliceSummary {
  gross: number;
  taxReserve: number;
  bills: number;
  realBalance: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<TaxSliceSummary>({ gross: 0, taxReserve: 0, bills: 0, realBalance: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [incomeEvents, setIncomeEvents] = useState<any[]>([]);
  const [sparkData, setSparkData] = useState<{ value: number }[]>([]);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setFinancials } = useFinancialStore();

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch income events
    const { data: income } = await supabase
      .from('income_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch committed bills
    const { data: bills } = await supabase
      .from('committed_bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    // Fetch recent invoices
    const { data: inv } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const gross = (income || []).reduce((a: number, e: any) => a + Number(e.net_amount), 0);
    const taxReserve = (income || []).reduce((a: number, e: any) => a + Number(e.tax_slice), 0);
    const billsTotal = (bills || []).reduce((a: number, b: any) => a + Number(b.amount), 0);
    const realBalance = gross - billsTotal;

    const s = { gross, taxReserve, bills: billsTotal, realBalance };
    setSummary(s);
    setFinancials({ grossBalance: gross, taxReserve, committedBills: billsTotal, realBalance });
    setInvoices(inv || []);
    setIncomeEvents((income || []).slice(0, 5));

    // Build 30-day sparkline
    const last30: { value: number }[] = [];
    let running = 0;
    const sorted = [...(income || [])].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now - i * 86400000).toDateString();
      const dayEvents = sorted.filter((e) => new Date(e.created_at).toDateString() === day);
      running += dayEvents.reduce((s: number, e: any) => s + Number(e.net_amount), 0);
      last30.push({ value: running });
    }
    setSparkData(last30);
    setLoading(false);
  }, [setFinancials]);

  useEffect(() => {
    loadData();
    // Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income_events' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const overdue = invoices.filter((i) => i.status === 'OVERDUE' || (i.status === 'SENT' && new Date(i.due_date) < new Date()));
  const positive = summary.realBalance >= 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#E6EDF3', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '12px', color: '#484F58', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowIncomeModal(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log Income
        </button>
      </div>

      {/* Real Balance Hero */}
      <div className="glass-card" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#8B949E', letterSpacing: '0.08em', marginBottom: '8px' }}>
              REAL BALANCE
            </div>
            <div style={{ marginBottom: '8px' }}>
              {loading ? (
                <span style={{ fontSize: '48px', fontWeight: '700', color: '#21262D' }}>₹ ---</span>
              ) : (
                <Odometer value={summary.realBalance} size="xl" color={positive ? '#E6EDF3' : '#EF4444'} />
              )}
            </div>
            <div className="thin-border" />
            <div style={{ marginTop: '12px', display: 'flex', gap: '24px', fontSize: '12px', color: '#8B949E' }}>
              <span>Gross: <span style={{ color: '#10B981' }}>{formatINR(summary.gross)}</span></span>
              <span>−Tax: <span style={{ color: '#F59E0B' }}>{formatINR(summary.taxReserve)}</span></span>
              <span>−Bills: <span style={{ color: '#6B7280' }}>{formatINR(summary.bills)}</span></span>
            </div>
          </div>
          <div style={{ width: '180px', height: '60px', position: 'absolute', top: '24px', right: '24px' }}>
            <Sparkline data={sparkData} positive={positive} height={60} />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'TAX VAULT', value: summary.taxReserve, color: '#F59E0B' },
          { label: 'GROSS INCOME', value: summary.gross, color: '#10B981' },
          { label: 'PENDING INVOICES', value: overdue.length, isCount: true, color: overdue.length > 0 ? '#EF4444' : '#6B7280' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '500', color: '#484F58', letterSpacing: '0.08em', marginBottom: '8px' }}>
              {kpi.label}
            </div>
            {kpi.isCount ? (
              <div style={{ fontSize: '32px', fontWeight: '700', color: kpi.color }}>
                {kpi.value}
              </div>
            ) : (
              <Odometer value={kpi.value as number} size="md" color={kpi.color} />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Receivables */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '16px' }}>
            Receivables
          </div>
          {invoices.filter((i) => i.status !== 'PAID').length === 0 ? (
            <p style={{ fontSize: '12px', color: '#484F58', textAlign: 'center', padding: '16px 0' }}>No open invoices</p>
          ) : (
            <table className="audit-grid">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Ref</th>
                  <th className="numeric">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter((i) => i.status !== 'PAID').slice(0, 5).map((inv) => {
                  const age = daysSince(inv.due_date);
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontSize: '12px' }}>{inv.client_name}</td>
                      <td style={{ fontSize: '11px', color: '#484F58' }}>{inv.invoice_ref}</td>
                      <td className="numeric" style={{ fontSize: '12px', color: agingColor(age) === 'text-critical' ? '#EF4444' : agingColor(age) === 'text-warning' ? '#F59E0B' : '#8B949E' }}>
                        {formatINR(inv.amount)}
                      </td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Audit Trail */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#E6EDF3', marginBottom: '16px' }}>
            Recent Pipeline Runs
          </div>
          {incomeEvents.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#484F58', textAlign: 'center', padding: '16px 0' }}>No income events yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incomeEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid #21262D',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: '#E6EDF3', fontWeight: '500' }}>{ev.client_name || 'Income'}</div>
                    <div style={{ fontSize: '11px', color: '#484F58', marginTop: '2px' }}>{formatDate(ev.event_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#10B981', fontWeight: '600' }}>+{formatINR(ev.net_amount)}</div>
                    <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '2px' }}>
                      Tax: {formatINR(ev.tax_slice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showIncomeModal && (
        <LogIncomeModal onClose={() => setShowIncomeModal(false)} onSuccess={() => { setShowIncomeModal(false); loadData(); }} />
      )}
    </div>
  );
}
