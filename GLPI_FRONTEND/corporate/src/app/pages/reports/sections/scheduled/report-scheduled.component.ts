import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ReportService } from '../../../../core/services/report.service';
import { ReturnValue, ScheduledReport } from '../../../../core/models';

@Component({
  selector: 'app-report-scheduled',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './report-scheduled.component.html'
})
export class ReportScheduled implements OnInit {
  private reportSvc = inject(ReportService);
  reports = signal<ScheduledReport[]>([]);
  loading = signal(false);

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.reportSvc.getScheduledReports().subscribe({
      next: (res: ReturnValue<ScheduledReport[]>) => {
        if (res?.data) {
          this.reports.set(res.data.map((r: ScheduledReport) => {
            const ui = { ...r };
            // Ensure UI legacy fields are populated if missing
            ui.name = r.reportName || r.name;
            ui.status = r.isActive ? 'Activo' : 'Inactivo';
            return ui as ScheduledReport;
          }));
        }
        this.loading.set(false);
      },
      error: () => { this.reports.set([]); this.loading.set(false); }
    });
  }

  onRunNow(id: string | number) { this.reportSvc.runNow(String(id)).subscribe(); }
  onDelete(id: string | number) { this.reportSvc.deleteScheduledReport(String(id)).subscribe(() => this.load()); }
}
