import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Asset, AssetSummary, AssetAssignment, AssetCreateUpdateDto, ReturnValue } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/asset`;

  getAll(): Observable<ReturnValue<AssetSummary[]>> {
    return this.http.get<ReturnValue<AssetSummary[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ReturnValue<Asset>> {
    return this.http.get<ReturnValue<Asset>>(`${this.apiUrl}/${id}`);
  }

  create(asset: AssetCreateUpdateDto, file?: File): Observable<ReturnValue<string>> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(asset));
    if (file) fd.append('file', file);
    return this.http.post<ReturnValue<string>>(this.apiUrl, fd);
  }

  update(id: string, asset: AssetCreateUpdateDto, file?: File): Observable<ReturnValue> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(asset));
    if (file) fd.append('file', file);
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, fd);
  }

  delete(id: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/${id}`);
  }

  getAssignments(id: string): Observable<ReturnValue<AssetAssignment[]>> {
    return this.http.get<ReturnValue<AssetAssignment[]>>(`${this.apiUrl}/${id}/assignments`);
  }
}
