export interface Enterprise {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  location?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt?: string;
  systemStatus?: 'modernized' | 'legacy' | 'in-progress';
  apiEndpoints?: string[];
}
