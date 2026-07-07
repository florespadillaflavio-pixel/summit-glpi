import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, DashboardKPIs, DashboardOperation } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getKPIs(from?: string, to?: string): Observable<ReturnValue<DashboardKPIs>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ReturnValue<DashboardKPIs>>(this.apiUrl, { params });
  }

  getOperations(): Observable<ReturnValue<DashboardOperation[]>> {
    return this.http.get<ReturnValue<DashboardOperation[]>>(`${this.apiUrl}/operations`);
  }
}
