import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, CatalogItem } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private apiUrl = `${environment.apiUrl}/catalog`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ReturnValue<CatalogItem[]>> {
    return this.http.get<ReturnValue<CatalogItem[]>>(this.apiUrl);
  }

  getGroupItems(groupCode: string): Observable<ReturnValue<CatalogItem[]>> {
    return this.http.get<ReturnValue<CatalogItem[]>>(`${this.apiUrl}/${groupCode}/items`);
  }

  createItem(groupCode: string, item: Partial<CatalogItem>): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/${groupCode}/items`, item);
  }

  updateItem(itemId: string, item: Partial<CatalogItem>): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/items/${itemId}`, item);
  }

  deleteItem(itemId: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/items/${itemId}`);
  }

  reorderItems(items: { id: string; sortOrder: number }[]): Observable<ReturnValue> {
    return this.http.patch<ReturnValue>(`${this.apiUrl}/items/reorder`, items);
  }
}
