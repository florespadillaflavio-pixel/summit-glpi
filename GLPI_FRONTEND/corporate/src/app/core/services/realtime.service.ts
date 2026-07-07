import { Injectable, inject, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private tokenSvc = inject(TokenService);
  private connection?: signalR.HubConnection;
  private starting?: Promise<void>;

  connected = signal(false);

  connectTickets(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    if (this.starting) return this.starting;

    const hubUrl = `${environment.apiUrl.replace(/\/api$/, '')}/hubs/tickets`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.tokenSvc.getToken() || '',
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onreconnecting(() => this.connected.set(false));
    this.connection.onclose(() => {
      this.connected.set(false);
      this.starting = undefined;
    });

    this.starting = this.connection.start()
      .then(() => this.connected.set(true))
      .catch(err => {
        this.connected.set(false);
        this.starting = undefined;
        throw err;
      });

    return this.starting;
  }

  on<T = any>(eventName: string, callback: (payload: T) => void): void {
    this.connection?.on(eventName, callback);
  }

  off(eventName: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.connection?.off(eventName, callback);
    } else {
      this.connection?.off(eventName);
    }
  }
}
