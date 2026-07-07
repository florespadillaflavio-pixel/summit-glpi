import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  progress?: number; // 0 to 100
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  notifications = signal<Notification[]>([]);

  show(message: string, type: NotificationType = 'info', duration: number = 5000): void {
    const id = Date.now().toString();
    const newNotif: Notification = { id, type, message, duration, progress: 100 };
    
    this.notifications.update(list => [...list, newNotif]);

    if (duration > 0) {
      this.startCountdown(id, duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration ?? 6000);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  remove(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  private startCountdown(id: string, duration: number): void {
    const start = Date.now();
    const interval = 50; // Update every 50ms

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      
      this.notifications.update(list => {
        return list.map(n => n.id === id ? { ...n, progress: remaining } : n);
      });

      if (remaining <= 0) {
        clearInterval(timer);
        this.remove(id);
      }
    }, interval);
  }
}
