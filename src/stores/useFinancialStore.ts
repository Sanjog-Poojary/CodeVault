'use client';

import { create } from 'zustand';

interface FinancialState {
    grossBalance: number;
    taxReserve: number;
    committedBills: number;
    realBalance: number;
    lastPipelineRun: string | null;
    isLoading: boolean;
    setFinancials: (data: {
        grossBalance: number;
        taxReserve: number;
        committedBills: number;
        realBalance: number;
    }) => void;
    setLastPipelineRun: (ts: string) => void;
    setLoading: (v: boolean) => void;
}

export const useFinancialStore = create<FinancialState>((set) => ({
    grossBalance: 0,
    taxReserve: 0,
    committedBills: 0,
    realBalance: 0,
    lastPipelineRun: null,
    isLoading: false,
    setFinancials: (data) => set(data),
    setLastPipelineRun: (ts) => set({ lastPipelineRun: ts }),
    setLoading: (v) => set({ isLoading: v }),
}));
