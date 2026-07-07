import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ticket, TicketDetail, TicketComment, TicketCommentCreateDto, TicketHistory, CreateTicketDto, ReturnValue, DashboardKPIs } from '../models';

export interface TicketUpdateDto {
  subject: string;
  description: string;
  typeItemId: string;
  priorityItemId: string;
  assetId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ticket`;

  getAll(): Observable<ReturnValue<Ticket[]>> {
    return this.http.get<ReturnValue<Ticket[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ReturnValue<TicketDetail>> {
    return this.http.get<ReturnValue<TicketDetail>>(`${this.apiUrl}/${id}`);
  }

  getDashboardStats(dateFrom: string, dateTo: string): Observable<ReturnValue<DashboardKPIs>> {
    return this.http.get<ReturnValue<DashboardKPIs>>(`${this.apiUrl}/dashboard`, {
      params: { from: dateFrom, to: dateTo }
    });
  }

  create(ticket: CreateTicketDto): Observable<ReturnValue<string>> {
    return this.http.post<ReturnValue<string>>(this.apiUrl, ticket);
  }

  update(id: string, ticket: TicketUpdateDto): Observable<ReturnValue> {
    return this.http.put<ReturnValue>(`${this.apiUrl}/${id}`, ticket);
  }

  updateStatus(id: string, statusItemId: string): Observable<ReturnValue> {
    return this.http.patch<ReturnValue>(`${this.apiUrl}/${id}/status`, { statusItemId });
  }

  assign(id: string, assignedToId: string | null): Observable<ReturnValue> {
    return this.http.patch<ReturnValue>(`${this.apiUrl}/${id}/assign`, { assignedToId });
  }

  getComments(ticketId: string): Observable<ReturnValue<TicketComment[]>> {
    return this.http.get<ReturnValue<TicketComment[]>>(`${this.apiUrl}/${ticketId}/comments`);
  }

  getHistory(ticketId: string): Observable<ReturnValue<TicketHistory[]>> {
    return this.http.get<ReturnValue<TicketHistory[]>>(`${this.apiUrl}/${ticketId}/history`);
  }

  addComment(ticketId: string, comment: TicketCommentCreateDto): Observable<ReturnValue> {
    return this.http.post<ReturnValue>(`${this.apiUrl}/${ticketId}/comments`, comment);
  }
}
