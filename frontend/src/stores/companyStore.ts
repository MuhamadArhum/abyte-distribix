import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  id: string;
  name: string;
  code: string;
}

interface CompanyState {
  company: Company | null;
  isSuperAdminLogin: boolean;
  selectCompany: (company: Company) => void;
  selectSuperAdminLogin: () => void;
  clearCompany: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      company: null,
      isSuperAdminLogin: false,
      selectCompany: (company) => set({ company, isSuperAdminLogin: false }),
      selectSuperAdminLogin: () => set({ company: null, isSuperAdminLogin: true }),
      clearCompany: () => set({ company: null, isSuperAdminLogin: false }),
    }),
    { name: 'company-storage' },
  ),
);
