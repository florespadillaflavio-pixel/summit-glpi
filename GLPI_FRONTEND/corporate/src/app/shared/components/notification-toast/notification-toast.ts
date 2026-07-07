import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from '../../../core/services/ui/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="toast-container">
      @for (notif of notifications(); track notif.id) {
        <div class="toast-card" [class]="notif.type">
          <div class="toast-content">
            <div class="toast-icon">
              <lucide-angular [name]="getIcon(notif.type)" [size]="20"></lucide-angular>
            </div>
            <div class="toast-body">
              <p class="toast-message">{{ notif.message }}</p>
            </div>
            <button class="toast-close" (click)="remove(notif.id)">
              <lucide-angular name="x" [size]="14"></lucide-angular>
            </button>
          </div>
          <div class="toast-progress">
            <div class="toast-progress-bar" [style.width.%]="notif.progress"></div>
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationToastComponent {
  private notifSvc = inject(NotificationService);
  notifications = this.notifSvc.notifications;

  remove(id: string) {
    this.notifSvc.remove(id);
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error':   return 'alert-circle';
      case 'warning': return 'alert-triangle';
      default:        return 'info';
    }
  }
}
