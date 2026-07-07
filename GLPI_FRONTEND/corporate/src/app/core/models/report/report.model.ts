export interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  lastRun?: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
}

export type ReportType = 'tickets' | 'assets' | 'sla';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Mirrors the backend `ScheduledReport` entity. Field names are aligned with
 * what the API binds/returns: name, reportType, frequency, recipients, format,
 * nextRunAt, isActive.
 */
export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType | string;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
  nextRunAt?: string | null;
  isActive: boolean;
}

/** Exact body keyed for POST/PUT /report/scheduled. */
export interface ScheduledReportPayload {
  name: string;
  reportType: ReportType | string;
  frequency: ReportFrequency;
  recipients: string[];
  format: ReportFormat;
  nextRunAt: string | null;
  isActive: boolean;
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
