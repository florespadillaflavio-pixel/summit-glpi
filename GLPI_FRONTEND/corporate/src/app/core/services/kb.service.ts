import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReturnValue, KbArticle, KbCategory } from '../models';

@Injectable({
  providedIn: 'root'
})
export class KbService {
  private apiUrl = `${environment.apiUrl}/kb`;

  constructor(private http: HttpClient) {}

  getArticles(filters?: { category?: string; q?: string; status?: string }): Observable<ReturnValue<KbArticle[]>> {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.q) params = params.set('q', filters.q);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<ReturnValue<KbArticle[]>>(`${this.apiUrl}`, { params });
  }

  getArticleById(id: string): Observable<ReturnValue<KbArticle>> {
    return this.http.get<ReturnValue<KbArticle>>(`${this.apiUrl}/${id}`);
  }

  createArticle(article: Partial<KbArticle>): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}`, article);
  }

  updateArticle(id: string, article: Partial<KbArticle>): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, article);
  }

  deleteArticle(id: string): Observable<ReturnValue> {
    return this.http.delete<ReturnValue>(`${this.apiUrl}/${id}`);
  }

  publishArticle(id: string): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/articles/${id}/publish`, {});
  }

  voteArticle(id: string, helpful: boolean): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/articles/${id}/vote`, { helpful });
  }

  suggest(query: string): Observable<ReturnValue<KbArticle[]>> {
    return this.http.get<ReturnValue<KbArticle[]>>(`${this.apiUrl}/suggest`, { params: { query } });
  }

  getCategories(): Observable<ReturnValue<KbCategory[]>> {
    return this.http.get<ReturnValue<KbCategory[]>>(`${this.apiUrl}/categories`);
  }
}
