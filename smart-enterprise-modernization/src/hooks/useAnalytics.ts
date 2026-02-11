import { useEffect, useState } from 'react';
import { getAnalytics } from '../services/analyticsService';
import type { DashboardStats } from '../types/analytics';

export const useAnalytics = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getAnalytics();
      setStats(data);
      setLoading(false);
    })();
  }, []);

  return { stats, loading };
};
