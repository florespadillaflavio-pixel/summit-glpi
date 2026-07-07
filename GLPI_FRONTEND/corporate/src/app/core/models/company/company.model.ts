export interface Company {
  id: string;
  name: string;
  ruc: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  isOwner: boolean;
  isActive: boolean;
  createdAt?: string;

  // Statistics from backend
  userCount?: number;
  assetCount?: number;
  ticketCount?: number;
}

export interface Tenant extends Company {
  domain: string;
  status: 'Activo' | 'Suspendido' | 'Trial';
  userCount: number;
  ticketCount: number;
  assetCount: number;
  since: string;
}
