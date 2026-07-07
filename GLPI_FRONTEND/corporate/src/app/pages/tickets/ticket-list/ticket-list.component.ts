import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { TicketService } from '../../../core/services/ticket.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ReportService } from '../../../core/services/report.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { Ticket, ReturnValue, AdHocReportRequest } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, PaginationComponent],
  templateUrl: './ticket-list.component.html'
})
export class TicketList implements OnInit, OnDestroy {
  private router   = inject(Router);
  private ticketSvc = inject(TicketService);
  private realtimeSvc = inject(RealtimeService);
  private reportSvc = inject(ReportService);
  private notifSvc = inject(NotificationService);
  private realtimeEvents = ['ticket-created', 'ticket-updated', 'ticket-status-changed', 'ticket-assigned', 'ticket-comment-added', 'ticket-note-added'];

  loading = signal(false);
  exporting = signal(false);
  errorMsg = signal('');
  tickets = signal<Ticket[]>([]);

  searchQuery = signal('');
  filterStatus = signal('ACTIVE');
  filterPriority = signal('');
  page = signal(1);
  pageSize = signal(12);

  ngOnInit() {
    this.load();
    this.realtimeSvc.connectTickets()
      .then(() => {
        for (const eventName of this.realtimeEvents) {
          this.realtimeSvc.on(eventName, this.onRealtimeTicketChange);
        }
      })
      .catch(() => this.notifSvc.warning('No se pudo iniciar la sincronización en tiempo real.'));
  }

  ngOnDestroy(): void {
    for (const eventName of this.realtimeEvents) {
      this.realtimeSvc.off(eventName, this.onRealtimeTicketChange);
    }
  }

  private onRealtimeTicketChange = () => this.load(false);

  load(showSpinner = true) {
    if (showSpinner) this.loading.set(true);
    this.errorMsg.set('');
    this.ticketSvc.getAll().subscribe({
      next: (res: ReturnValue<Ticket[]>) => {
        if (res.success && res.data) {
          this.tickets.set(res.data.map((t: Ticket) => ({
            id:          t.id,
            ticketNumber: t.ticketNumber,
            subject:      t.subject,
            description:  t.description || '',
            statusName:   t.statusName,
            statusCode:   t.statusCode,
            statusColor:  t.statusColor,
            priorityName: t.priorityName,
            priorityCode: t.priorityCode,
            requesterName: t.requesterName,
            assignedToName: t.assignedToName,
            createdAt:    new Date(t.createdAt)
          } as Ticket)));
        } else {
          this.errorMsg.set(res.message || 'No se pudo cargar la mesa de ayuda.');
        }
        if (showSpinner) this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message || 'No se pudo conectar con el servidor.');
        if (showSpinner) this.loading.set(false);
      }
    });
  }

  activeStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING'];
  totalTickets = computed(() => this.tickets().length);
  openTickets = computed(() => this.tickets().filter(t => this.activeStatuses.includes(t.statusCode)).length);
  criticalTickets = computed(() => this.tickets().filter(t => ['CRITICAL', 'HIGH'].includes(t.priorityCode)).length);
  resolvedTickets = computed(() => this.tickets().filter(t => t.statusCode === 'RESOLVED').length);
  closedTickets = computed(() => this.tickets().filter(t => t.statusCode === 'CLOSED').length);

  filteredTickets = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const status = this.filterStatus();
    const priority = this.filterPriority();
    return this.tickets().filter(t => {
      const matchQ = !q || t.subject.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q) || t.requesterName.toLowerCase().includes(q);
      const matchSt = status === 'ACTIVE'
        ? this.activeStatuses.includes(t.statusCode)
        : (!status || t.statusCode === status);
      const matchPr = !priority || t.priorityCode === priority;
      return matchQ && matchSt && matchPr;
    });
  });

  pagedTickets = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredTickets().slice(start, start + this.pageSize());
  });

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  onFilterStatus(event: Event) {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  onFilterPriority(event: Event) {
    this.filterPriority.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  setPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.filteredTickets().length / this.pageSize()));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  goToDetail(id: string) { this.router.navigate(['/tickets', id]); }

  onExport() {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.notifSvc.info('Preparando descarga de reporte...');

    const filters: AdHocReportRequest = { dateFrom: null, dateTo: null, format: 'EXCEL' };
    this.reportSvc.generateTicketReport(filters)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (res) => this.handleExportDownload(res),
        error: () => this.notifSvc.error('No se pudo generar el reporte. Inténtalo nuevamente.')
      });
  }

  private handleExportDownload(res: HttpResponse<Blob>) {
    const blob = res.body;
    if (!blob || blob.size === 0) {
      this.notifSvc.error('El reporte generado llegó vacío.');
      return;
    }

    const filename = this.resolveExportFilename(res);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    this.notifSvc.success('Reporte generado correctamente.');
  }

  /** Prefer the server's Content-Disposition filename; fall back to a dated default. */
  private resolveExportFilename(res: HttpResponse<Blob>): string {
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      if (match?.[1]) {
        try {
          return decodeURIComponent(match[1].trim());
        } catch {
          return match[1].trim();
        }
      }
    }
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `reporte-tickets-${stamp}.xlsx`;
  }

  statusStage(code: string): string {
    if (code === 'RESOLVED') return 'Resuelto, falta cierre';
    if (code === 'CLOSED') return 'Cerrado, solo lectura';
    if (code === 'WAITING') return 'Esperando usuario';
    return 'En atención';
  }

  statusPhaseLabel(code: string): string {
    if (code === 'RESOLVED') return 'Resuelto';
    if (code === 'CLOSED') return 'Cerrado';
    return 'Activo';
  }

  statusPhaseColor(code: string, fallback = '#5AAFB8'): string {
    if (code === 'RESOLVED') return '#16a34a';
    if (code === 'CLOSED') return '#64748b';
    return fallback || '#5AAFB8';
  }

  statusClass(code: string): string {
    const normalized = (code || '').toLowerCase().replace(/_/g, '-');
    return normalized ? `status-${normalized}` : 'status-default';
  }

  priorityClass(code: string): string {
    const normalized = (code || '').toLowerCase();
    return normalized ? `priority-${normalized}` : 'priority-medium';
  }
}
