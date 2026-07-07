import { Injectable } from '@angular/core';
import { UserSession, UserPermission } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'glpi_token';
  private readonly USER_KEY = 'glpi_user';

  private isValidToken(token: string | null | undefined): token is string {
    return !!token && token !== 'undefined' && token !== 'null';
  }

  setToken(token: string): void {
    if (!this.isValidToken(token)) {
      localStorage.removeItem(this.TOKEN_KEY);
      return;
    }
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setUser(user: UserSession): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): UserSession | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setSession(session: UserSession): void {
    if (!this.isValidToken(session?.token)) {
      this.clear();
      return;
    }
    this.setToken(session.token);
    this.setUser(session);
  }

  isTokenValid(): boolean {
    return this.isValidToken(this.getToken());
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user || !user.permissions) return false;
    return user.permissions.some((p: UserPermission) => p.permission_Code === permission);
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
