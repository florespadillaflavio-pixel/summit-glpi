import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, TenantConfig } from '../models';

export interface ConfigSaveDto {
  configGroup: string;
  configKey: string;
  configValue: string;
  valueType: string;
  description: string;
  isSensitive: boolean;
}

export interface SmtpTestDto {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  enableSsl?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/config`;

  getByGroup(group?: string): Observable<ReturnValue<TenantConfig[]>> {
    const url = group ? `${this.apiUrl}?group=${group}` : this.apiUrl;
    return this.http.get<ReturnValue<TenantConfig[]>>(url);
  }

  save(config: ConfigSaveDto): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(this.apiUrl, config);
  }

  testSmtp(config: SmtpTestDto): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/test-smtp`, config);
  }
}
