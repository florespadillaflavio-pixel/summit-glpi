export interface AuditEntry {
  id: string | number;
  timestamp: string;
  user: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  entity: string;
  entityType?: string;
  entityId: string;
  summary: string;
  details: string;
  ip: string;
  oldValues: Record<string, unknown> | string;
  newValues: Record<string, unknown> | string;
}
