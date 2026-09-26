'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Branch {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface BranchContextType {
  activeBranchId: string | null; // null means 'All Branches'
  setActiveBranchId: (id: string | null) => void;
  branches: Branch[];
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await invoke<Branch[]>('list_branches');
        setBranches(data || []);
      } catch (err) {
        console.error('Şubeler yüklenemedi:', err);
      }
    }
    loadBranches();
  }, []);

  return (
    <BranchContext.Provider value={{ activeBranchId, setActiveBranchId, branches }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
