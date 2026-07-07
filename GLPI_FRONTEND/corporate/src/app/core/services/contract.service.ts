import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, Contract } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = `${environment.apiUrl}/contract`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { status?: string; type?: string; expiresIn?: number }): Observable<ReturnValue<Contract[]>> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.expiresIn) params = params.set('expiresIn', filters.expiresIn.toString());
    return this.http.get<ReturnValue<Contract[]>>(this.apiUrl, { params });
  }

  getById(id: string): Observable<ReturnValue<Contract>> {
    return this.http.get<ReturnValue<Contract>>(`${this.apiUrl}/${id}`);
  }

  create(contract: Partial<Contract>): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(this.apiUrl, contract);
  }

  update(id: string, contract: Partial<Contract>): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, contract);
  }

  getExpiring(days: number = 90): Observable<ReturnValue<Contract[]>> {
    return this.http.get<ReturnValue<Contract[]>>(`${this.apiUrl}/expiring`, { params: { days: days.toString() } });
  }

  addAssets(contractId: string, assetIds: string[]): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/${contractId}/assets`, { assetIds });
  }

  removeAsset(contractId: string, assetId: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/${contractId}/assets/${assetId}`);
  }
}
