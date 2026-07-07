import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuditEntry } from '../../../core/models';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './audit-detail.component.html'
})
export class AuditDetail {
  entry = input<AuditEntry | null>(null);
  close = output<void>();
  copiedId = signal(false);

  onClose() { this.close.emit(); }

  copyId(): void {
    const id = this.entry()?.entityId;
    if (!id) return;
    navigator.clipboard?.writeText(id);
    this.copiedId.set(true);
    setTimeout(() => this.copiedId.set(false), 1400);
  }

  actionLabel(action: string | undefined): string {
    const map: Record<string, string> = {
      CREATE: 'Creación',
      UPDATE: 'Actualización',
      DELETE: 'Eliminación',
      LOGIN: 'Inicio de sesión',
    };
    return map[String(action || '').toUpperCase()] ?? (action || 'Evento');
  }

  actionBadgeClass(action: string | undefined): string {
    const map: Record<string, string> = {
      CREATE: 'is-success',
      UPDATE: 'is-info',
      DELETE: 'is-danger',
      LOGIN: 'is-navy',
    };
    return map[String(action || '').toUpperCase()] ?? 'is-neutral';
  }

  actionIcon(action: string | undefined): string {
    const map: Record<string, string> = {
      CREATE: 'plus',
      UPDATE: 'pencil',
      DELETE: 'trash-2',
      LOGIN: 'log-in',
    };
    return map[String(action || '').toUpperCase()] ?? 'shield';
  }

  displayEntity(value: string | undefined): string {
    return String(value || 'Sistema').split(':')[0];
  }

  shortId(value: string | undefined): string {
    if (!value) return '-';
    return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
  }

  formatDate(value: string | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  formatJson(val: Record<string, unknown> | string | undefined): string {
    if (!val) return '{}';
    if (typeof val === 'string') {
      try {
        return JSON.stringify(JSON.parse(val), null, 2);
      } catch {
        return val;
      }
    }
    if (Object.keys(val).length === 0) return '{}';
    return JSON.stringify(val, null, 2);
  }
}
