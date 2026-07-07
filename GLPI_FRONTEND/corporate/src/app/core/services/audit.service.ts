import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, AuditEntry, PagedResult } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = `${environment.apiUrl}/audit`;

  constructor(private http: HttpClient) {}

  getAll(filters?: {
    action?: string;
    entity?: string;
    q?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Observable<ReturnValue<PagedResult<AuditEntry>>> {
    let params = new HttpParams();
    if (filters?.action) params = params.set('action', filters.action);
    if (filters?.entity) params = params.set('entity', filters.entity);
    if (filters?.q) params = params.set('q', filters.q);
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize.toString());
    return this.http.get<ReturnValue<PagedResult<AuditEntry>>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<ReturnValue<AuditEntry>> {
    return this.http.get<ReturnValue<AuditEntry>>(`${this.apiUrl}/${id}`);
  }

  getEntityTimeline(entityName: string, entityId: string): Observable<ReturnValue<AuditEntry[]>> {
    return this.http.get<ReturnValue<AuditEntry[]>>(`${this.apiUrl}/entity/${entityName}/${entityId}`);
  }
}
