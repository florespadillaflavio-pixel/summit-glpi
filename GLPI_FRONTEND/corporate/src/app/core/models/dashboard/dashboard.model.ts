export interface DashboardKPIs {
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  slaBreached: number;
  totalTickets: number;
  avgResolutionHrs: number;
  totalAssets: number;
  expiringContracts: number;
}

export interface DashboardOperation {
  id: string;
  type: string;
  summary: string;
  status: string;
  createdAt: string;
}
