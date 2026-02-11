export interface Vehicle {
  id: string;
  vin?: string;
  model: string;
  manufacturer?: string;
  year: number;
  enterpriseId?: string;
  status: 'active' | 'maintenance' | 'retired';
  telemetry?: TelemetryData;
  createdAt?: string;
  lastSeen?: number;
}

export interface TelemetryData {
  speed: number;
  fuelLevel: number;
  location?: { lat: number; lng: number };
  lastUpdated?: number;
}
