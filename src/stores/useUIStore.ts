'use client';

import { create } from 'zustand';

interface UIState {
    sidebarOpen: boolean;
    activeModal: string | null;
    isGlobalLoading: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    openModal: (id: string) => void;
    closeModal: () => void;
    setGlobalLoading: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    activeModal: null,
    isGlobalLoading: false,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    openModal: (id) => set({ activeModal: id }),
    closeModal: () => set({ activeModal: null }),
    setGlobalLoading: (v) => set({ isGlobalLoading: v }),
}));
