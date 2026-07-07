import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, Company } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/company`;

  getAll(): Observable<ReturnValue<Company[]>> {
    return this.http.get<ReturnValue<Company[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ReturnValue<Company>> {
    return this.http.get<ReturnValue<Company>>(`${this.apiUrl}/${id}`);
  }

  create(company: Partial<Company>, file?: File): Observable<ReturnValue> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(company));
    if (file) fd.append('file', file);
    return this.http.post<ReturnValue>(this.apiUrl, fd);
  }

  update(id: string, company: Partial<Company>, file?: File): Observable<ReturnValue> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(company));
    if (file) fd.append('file', file);
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, fd);
  }

  suspend(id: string): Observable<ReturnValue> {
    return this.http.patch<ReturnValue>(`${this.apiUrl}/${id}/status`, {});
  }

  delete(id: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/${id}`);
  }
}
