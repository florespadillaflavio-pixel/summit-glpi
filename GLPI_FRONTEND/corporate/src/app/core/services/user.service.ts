import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserSummary, UserDetails, UserCreateUpdateDto, ReturnValue, StatusUpdateDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/user`;

  getAll(): Observable<ReturnValue<UserSummary[]>> {
    return this.http.get<ReturnValue<UserSummary[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ReturnValue<UserDetails>> {
    return this.http.get<ReturnValue<UserDetails>>(`${this.apiUrl}/${id}`);
  }

  create(user: UserCreateUpdateDto, file?: File): Observable<ReturnValue<string>> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(user));
    if (file) fd.append('file', file);
    return this.http.post<ReturnValue<string>>(this.apiUrl, fd);
  }

  update(id: string, user: UserCreateUpdateDto, file?: File): Observable<ReturnValue> {
    const fd = new FormData();
    fd.append('data', JSON.stringify(user));
    if (file) fd.append('file', file);
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, fd);
  }

  delete(id: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: string, isActive: boolean): Observable<ReturnValue> {
    return this.http.patch<ReturnValue>(`${this.apiUrl}/${id}/status`, { isActive });
  }
}
