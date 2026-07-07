import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-custom-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, LucideAngularModule],
  template: `
    <button mat-flat-button 
            [color]="color" 
            [disabled]="disabled" 
            class="glpi-button"
            [ngClass]="customClass">
      <div class="flex items-center justify-center gap-2">
        <lucide-angular *ngIf="icon" [name]="icon" class="w-5 h-5"></lucide-angular>
        <ng-content></ng-content>
      </div>
    </button>
  `
})
export class CustomButtonComponent {
  @Input() color: 'primary' | 'accent' | 'warn' | '' = 'primary';
  @Input() disabled = false;
  @Input() icon?: string;
  @Input() customClass = '';
}
