import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import type { DashboardStats } from '../types/analytics';
import type { Vehicle } from '../types/vehicle';
import type { Enterprise } from '../types/enterprise';
import type { User } from '../types/user';

export const getAnalytics = async (): Promise<DashboardStats> => {
  const [entsSnap, vehSnap, userSnap] = await Promise.all([
    getDocs(collection(db, 'enterprises')),
    getDocs(collection(db, 'vehicles')),
    getDocs(collection(db, 'users')),
  ]);
  const enterprises = entsSnap.docs.map((d) => d.data() as Enterprise);
  const vehicles = vehSnap.docs.map((d) => d.data() as Vehicle);
  const users = userSnap.docs.map((d) => d.data() as User);

  return {
    totalEnterprises: enterprises.length,
    modernizedSystems: enterprises.filter(
      (e) => e.systemStatus === 'modernized'
    ).length,
    activeVehicles: vehicles.filter((v) => v.status === 'active').length,
    totalUsers: users.length,
    averageResponseTime: Math.floor(Math.random() * 150 + 50),
  };
};
