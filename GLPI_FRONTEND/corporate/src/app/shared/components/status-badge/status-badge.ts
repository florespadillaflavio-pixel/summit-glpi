import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="glpi-badge" [ngClass]="badgeClass">
      <span class="dot" [style.background-color]="dotColor"></span>
      {{ label }}
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() type: 'status' | 'priority' = 'status';
  @Input() value = '';

  get badgeClass(): string {
    return `${this.type}-${this.value.toLowerCase().replace('_', '-')}`;
  }

  get dotColor(): string {
    // Lógica simple para colores de puntos si se desea
    switch(this.value.toUpperCase()) {
      case 'OPEN': return '#2563eb';
      case 'IN_PROGRESS': return '#d97706';
      case 'RESOLVED': return '#16a34a';
      case 'CRITICAL': return '#dc2626';
      default: return '#64748b';
    }
  }
}
