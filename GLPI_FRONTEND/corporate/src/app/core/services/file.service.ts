import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ReturnValue } from '../models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/file`;

  upload(file: File, folder: string = 'general'): Observable<ReturnValue<string>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ReturnValue<string>>(`${this.apiUrl}/upload?folder=${folder}`, formData);
  }
}
