import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glpi-card p-6" [ngClass]="customClass">
      <div *ngIf="title || subtitle" class="mb-4">
        <h3 *ngIf="title" class="text-xl font-bold text-slate-800 m-0">{{ title }}</h3>
        <p *ngIf="subtitle" class="text-sm text-slate-500 m-0 mt-1">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content>
    </div>
  `
})
export class CustomCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() customClass = '';
}
