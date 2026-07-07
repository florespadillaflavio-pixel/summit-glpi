import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai`;

  analyzeTicket(subject: string, description: string): Observable<ReturnValue<string>> {
    return this.http.get<ReturnValue<string>>(`${this.apiUrl}/analyze-ticket`, {
      params: { subject, description }
    });
  }
}
