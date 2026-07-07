import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginDto, LoginResponse, ReturnValue, UserSession } from '../models';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenSvc = inject(TokenService);
  private apiUrl = `${environment.apiUrl}/auth`;

  private _currentUser = new BehaviorSubject<UserSession | null>(null);
  currentUser$ = this._currentUser.asObservable();

  private _pendingChangeUserId: string | null = null;
  /** UserId of a temp-password user who logged in but must change their password before a session is issued. */
  get pendingChangeUserId(): string | null {
    return this._pendingChangeUserId;
  }

  login(credentials: LoginDto): Observable<ReturnValue<LoginResponse>> {
    return this.http.post<ReturnValue<LoginResponse>>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.data) {
          const data = res.data;
          // Temp-password / token-less response: no session yet, stash the userId
          // so the mandatory change-password flow can proceed.
          if (data.mustChangePassword || !data.token) {
            this._pendingChangeUserId = data.userId;
            return;
          }
          const session = this.buildSession(data, credentials.username);
          this.tokenSvc.setSession(session);
          this._currentUser.next(session);
        }
      })
    );
  }

  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<ReturnValue<LoginResponse>> {
    return this.http.post<ReturnValue<LoginResponse>>(`${this.apiUrl}/change-password`, {
      userId,
      currentPassword,
      newPassword
    }).pipe(
      tap(res => {
        if (res.success && res.data && res.data.token) {
          const session = this.buildSession(res.data);
          this.tokenSvc.setSession(session);
          this._currentUser.next(session);
          this._pendingChangeUserId = null;
        }
      })
    );
  }

  private buildSession(data: LoginResponse, fallbackUsername = ''): UserSession {
    return {
      userId: data.userId,
      companyId: data.companyId,
      companyName: data.profile?.companyName || '',
      username: data.username || fallbackUsername,
      token: data.token,
      role: data.profile?.role || '',
      isInternal: data.profile?.isInternal || false,
      firstName: data.profile?.firstName || '',
      lastName: data.profile?.lastName || '',
      avatarUrl: data.profile?.avatarUrl || '',
      permissions: data.permissions || []
    };
  }

  logout(): void {
    this.tokenSvc.clear();
    this._pendingChangeUserId = null;
    this._currentUser.next(null);
  }

  isLoggedIn(): boolean {
    return this.tokenSvc.isTokenValid();
  }

  getSessions(): Observable<ReturnValue<UserSession[]>> {
    return this.http.get<ReturnValue<UserSession[]>>(`${this.apiUrl}/sessions`);
  }
}
