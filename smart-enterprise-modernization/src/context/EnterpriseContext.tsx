'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getEnterprises } from '../services/enterpriseService';
import type { Enterprise } from '../types/enterprise';

interface EntCtx {
  enterprises: Enterprise[];
  loading: boolean;
  refreshEnterprises: () => Promise<void>;
}
const EnterpriseContext = createContext<EntCtx>({
  enterprises: [],
  loading: true,
  refreshEnterprises: async () => {},
});

export const EnterpriseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const e = await getEnterprises();
    setEnterprises(e);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  return (
    <EnterpriseContext.Provider
      value={{ enterprises, loading, refreshEnterprises: fetch }}
    >
      {children}
    </EnterpriseContext.Provider>
  );
};

export const useEnterpriseContext = () => useContext(EnterpriseContext);
