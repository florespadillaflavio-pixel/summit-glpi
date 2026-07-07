import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ReportService } from '../../../../core/services/report.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { ReturnValue, ScheduledReport } from '../../../../core/models';
import { ScheduledReportForm } from './scheduled-report-form/scheduled-report-form.component';

@Component({
  selector: 'app-report-scheduled',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ScheduledReportForm],
  templateUrl: './report-scheduled.component.html'
})
export class ReportScheduled implements OnInit {
  private reportSvc = inject(ReportService);
  private notifSvc = inject(NotificationService);

  reports = signal<ScheduledReport[]>([]);
  loading = signal(false);

  // Modal state
  showForm = signal(false);
  selectedReport = signal<ScheduledReport | null>(null);

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.reportSvc.getScheduledReports().subscribe({
      next: (res: ReturnValue<ScheduledReport[]>) => {
        this.reports.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: () => { this.reports.set([]); this.loading.set(false); }
    });
  }

  /** Opened from the shell's "Nuevo Reporte" button. */
  openCreate() {
    this.selectedReport.set(null);
    this.showForm.set(true);
  }

  openEdit(report: ScheduledReport) {
    this.selectedReport.set(report);
    this.showForm.set(true);
  }

  onCloseForm() {
    this.showForm.set(false);
    this.selectedReport.set(null);
  }

  onSaved() {
    this.onCloseForm();
    this.load();
  }

  typeLabel(type: string | undefined): string {
    switch (type) {
      case 'tickets': return 'Tickets';
      case 'assets': return 'Activos';
      case 'sla': return 'SLA';
      default: return type || 'Sencillo';
    }
  }

  /** Run-now has no backend engine yet: surface a graceful notice instead of a 404. */
  onRunNow() {
    this.notifSvc.info('Disponible próximamente');
  }

  onDelete(id: string | number) {
    this.reportSvc.deleteScheduledReport(String(id)).subscribe(() => this.load());
  }
}
