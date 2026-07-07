import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, RolePermissionMatrix, ReturnValue } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/role`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ReturnValue<Role[]>> {
    return this.http.get<ReturnValue<Role[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ReturnValue<Role>> {
    return this.http.get<ReturnValue<Role>>(`${this.apiUrl}/${id}`);
  }

  create(role: Partial<Role>): Observable<ReturnValue<string>> {
    return this.http.post<ReturnValue<string>>(this.apiUrl, role);
  }

  update(id: string, role: Partial<Role>): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, role);
  }

  delete(id: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/${id}`);
  }

  getPermissions(roleId: string): Observable<ReturnValue<RolePermissionMatrix[]>> {
    return this.http.get<ReturnValue<RolePermissionMatrix[]>>(`${this.apiUrl}/${roleId}/permissions`);
  }

  setPermissions(roleId: string, permissionIds: string[]): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/${roleId}/permissions`, { permissionIds });
  }

  getAllPermissions(): Observable<ReturnValue<RolePermissionMatrix[]>> {
    return this.http.get<ReturnValue<RolePermissionMatrix[]>>(`${environment.apiUrl}/permission`);
  }
}
