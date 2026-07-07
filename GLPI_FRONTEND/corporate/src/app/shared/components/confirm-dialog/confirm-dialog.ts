import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';

export interface ConfirmDialogData {
  title: string;
  message: string;
  items?: Array<{ label: string; value: string }>;
  kicker?: string;
  subtitle?: string;
  tone?: 'default' | 'ai' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  color?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatDialogModule, MatButtonModule, LucideAngularModule],
  template: `
    <div class="premium-dialog-wrapper" [ngClass]="dialogTone">
      <header class="dialog-premium-header">
        <div class="dialog-icon-box" [ngClass]="data.color || 'primary'">
          <lucide-angular [name]="data.icon || 'alert-triangle'" [size]="24"></lucide-angular>
        </div>
        <div class="dialog-heading">
          <span class="dialog-kicker">{{ data.kicker || defaultKicker }}</span>
          <h2 class="dialog-premium-title">{{ data.title }}</h2>
          <p *ngIf="data.subtitle" class="dialog-subtitle">{{ data.subtitle }}</p>
        </div>
      </header>

      <section class="dialog-premium-body">
        <p class="dialog-premium-text">{{ data.message }}</p>

        <div *ngIf="data.items?.length" class="dialog-ai-items">
          <div class="dialog-ai-item" *ngFor="let item of data.items">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <footer class="dialog-actions">
        <button *ngIf="data.cancelText" mat-stroked-button class="btn-dialog-cancel" (click)="onCancel()">
          {{ data.cancelText }}
        </button>
        <button mat-flat-button
                class="btn-summit-dialog"
                [ngClass]="data.color === 'warn' ? 'btn-warn' : 'btn-primary-summit'"
                (click)="onConfirm()">
          <span class="btn-dialog-text">{{ data.confirmText || 'Aceptar' }}</span>
        </button>
      </footer>
    </div>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  get dialogTone(): string {
    return `tone-${this.data.tone || (this.data.color === 'warn' ? 'danger' : 'default')}`;
  }

  get defaultKicker(): string {
    if (this.data.tone === 'ai') return 'Asistente inteligente';
    if (this.data.color === 'warn' || this.data.tone === 'danger') return 'Confirmación requerida';
    return 'Mesa de ayuda';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
