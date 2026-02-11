export interface User {
  uid: string;
  email: string;
  name?: string;
  role?: "admin"|"manager"|"employee"|"developer";
  enterpriseId?: string;
  createdAt?: string;
  lastLogin?: string;
}
