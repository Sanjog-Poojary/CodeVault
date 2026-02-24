'use client';

import { create } from 'zustand';

export interface Expense {
    id: string;
    user_id: string;
    amount: number;
    description: string;
    category: string | null;
    ai_confidence: number | null;
    is_deductible: boolean;
    expense_date: string;
    reviewed: boolean;
    created_at: string;
}

interface ExpenseState {
    expenses: Expense[];
    categorizingIds: Set<string>;
    setExpenses: (expenses: Expense[]) => void;
    addExpense: (expense: Expense) => void;
    updateExpense: (id: string, updates: Partial<Expense>) => void;
    startCategorizing: (id: string) => void;
    stopCategorizing: (id: string) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
    expenses: [],
    categorizingIds: new Set(),
    setExpenses: (expenses) => set({ expenses }),
    addExpense: (expense) =>
        set((state) => ({ expenses: [expense, ...state.expenses] })),
    updateExpense: (id, updates) =>
        set((state) => ({
            expenses: state.expenses.map((e) =>
                e.id === id ? { ...e, ...updates } : e
            ),
        })),
    startCategorizing: (id) =>
        set((state) => {
            const next = new Set(state.categorizingIds);
            next.add(id);
            return { categorizingIds: next };
        }),
    stopCategorizing: (id) =>
        set((state) => {
            const next = new Set(state.categorizingIds);
            next.delete(id);
            return { categorizingIds: next };
        }),
}));
