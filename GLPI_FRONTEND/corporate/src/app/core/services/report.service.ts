import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, ScheduledReport, ScheduledReportPayload, ReportHistory, AdHocReportRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/report`;

  constructor(private http: HttpClient) {}

  getScheduledReports(): Observable<ReturnValue<ScheduledReport[]>> {
    return this.http.get<ReturnValue<ScheduledReport[]>>(`${this.apiUrl}/scheduled`);
  }

  createScheduledReport(payload: ScheduledReportPayload): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/scheduled`, payload);
  }

  updateScheduledReport(id: string, payload: ScheduledReportPayload): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/scheduled/${id}`, payload);
  }

  deleteScheduledReport(id: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/scheduled/${id}`);
  }

  runNow(id: string): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/scheduled/${id}/run`, {});
  }

  getHistory(id: string): Observable<ReturnValue<ReportHistory[]>> {
    return this.http.get<ReturnValue<ReportHistory[]>>(`${this.apiUrl}/scheduled/${id}/history`);
  }

  generateTicketReport(filters: AdHocReportRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.apiUrl}/ad-hoc/tickets`, filters, { responseType: 'blob', observe: 'response' });
  }

  generateAssetReport(filters: AdHocReportRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.apiUrl}/ad-hoc/assets`, filters, { responseType: 'blob', observe: 'response' });
  }

  generateSlaReport(filters: AdHocReportRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.apiUrl}/ad-hoc/sla`, filters, { responseType: 'blob', observe: 'response' });
  }
}
