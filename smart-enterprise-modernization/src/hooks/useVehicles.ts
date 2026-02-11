import { useEffect, useState } from 'react';
import { getVehicles } from '../services/vehicleService';
import type { Vehicle } from '../types/vehicle';

export const useVehicles = (enterpriseId?: string) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await getVehicles(enterpriseId);
      if (mounted) {
        setVehicles(data);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [enterpriseId]);

  return { vehicles, loading };
};
