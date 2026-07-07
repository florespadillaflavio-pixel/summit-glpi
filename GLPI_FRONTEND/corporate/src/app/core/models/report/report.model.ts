export interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  lastRun?: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recipients: string[];
  lastRun?: string;
  nextRun: string;
  isActive: boolean;
  
  // UI legacy compatibility
  name?: string;
  type?: string;
  status?: string;
}

export interface ReportHistory {
  id: string;
  reportName: string;
  generatedAt: string;
  status: 'Success' | 'Failed';
  url?: string;
}

export interface ReportFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type ReportFormat = 'PDF' | 'EXCEL';

export interface AdHocReportRequest {
  dateFrom: string | null;
  dateTo: string | null;
  format: ReportFormat;
}

export interface ReportDataRow {
  [key: string]: string | number | boolean | null | undefined;
}
