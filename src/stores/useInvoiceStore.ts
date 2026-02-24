'use client';

import { create } from 'zustand';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'OVERDUE' | 'PAID';

export interface Invoice {
    id: string;
    user_id: string;
    client_name: string;
    amount: number;
    currency: string;
    status: InvoiceStatus;
    due_date: string;
    paid_date: string | null;
    invoice_ref: string;
    created_at: string;
}

interface InvoiceState {
    invoices: Invoice[];
    setInvoices: (invoices: Invoice[]) => void;
    updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
    addInvoice: (invoice: Invoice) => void;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
    invoices: [],
    setInvoices: (invoices) => set({ invoices }),
    updateInvoiceStatus: (id, status) =>
        set((state) => ({
            invoices: state.invoices.map((inv) =>
                inv.id === id ? { ...inv, status } : inv
            ),
        })),
    addInvoice: (invoice) =>
        set((state) => ({ invoices: [invoice, ...state.invoices] })),
}));
