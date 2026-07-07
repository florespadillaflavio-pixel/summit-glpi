import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ReportService } from '../../../../core/services/report.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { AdHocReportRequest, ReportFormat } from '../../../../core/models';

type ReportType = 'tickets' | 'assets' | 'sla';

/**
 * Cross-field validator: when BOTH dates are provided, dateFrom must be <= dateTo.
 * Date inputs yield 'YYYY-MM-DD' strings, which sort correctly lexicographically.
 */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('dateFrom')?.value;
  const to = group.get('dateTo')?.value;
  if (from && to && from > to) {
    return { dateRange: true };
  }
  return null;
}

@Component({
  selector: 'app-report-adhoc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './report-adhoc.component.html'
})
export class ReportAdhoc {
  private fb = inject(FormBuilder);
  private reportSvc = inject(ReportService);
  private notifSvc = inject(NotificationService);

  /** Which report is currently being generated (null when idle). */
  loadingType = signal<ReportType | null>(null);

  /** One independent form per report section. */
  forms: Record<ReportType, FormGroup> = {
    tickets: this.buildForm(),
    assets: this.buildForm(),
    sla: this.buildForm()
  };

  private buildForm(): FormGroup {
    return this.fb.group(
      {
        dateFrom: [null as string | null],
        dateTo: [null as string | null],
        format: ['PDF' as ReportFormat, Validators.required]
      },
      { validators: dateRangeValidator }
    );
  }

  isLoading(type: ReportType): boolean {
    return this.loadingType() === type;
  }

  /** True while any section is generating, so buttons of other cards stay guarded too. */
  get anyLoading(): boolean {
    return this.loadingType() !== null;
  }

  /** Message for the cross-field date range error, once the user has touched a date. */
  dateError(type: ReportType): string | null {
    const g = this.forms[type];
    const touched = g.get('dateFrom')?.touched || g.get('dateTo')?.touched;
    if (g.hasError('dateRange') && touched) {
      return 'La fecha "Desde" no puede ser posterior a "Hasta".';
    }
    return null;
  }

  onGenerate(type: ReportType): void {
    const form = this.forms[type];
    if (form.invalid || this.anyLoading) {
      form.markAllAsTouched();
      return;
    }

    const raw = form.value as { dateFrom: string | null; dateTo: string | null; format: ReportFormat };
    const filters: AdHocReportRequest = {
      dateFrom: raw.dateFrom || null,
      dateTo: raw.dateTo || null,
      format: raw.format
    };

    this.loadingType.set(type);

    this.requestFor(type, filters)
      .pipe(finalize(() => this.loadingType.set(null)))
      .subscribe({
        next: (res) => this.handleDownload(res, type, filters.format),
        error: () => this.notifSvc.error('No se pudo generar el reporte. Inténtalo nuevamente.')
      });
  }

  private requestFor(type: ReportType, filters: AdHocReportRequest): Observable<HttpResponse<Blob>> {
    switch (type) {
      case 'tickets':
        return this.reportSvc.generateTicketReport(filters);
      case 'assets':
        return this.reportSvc.generateAssetReport(filters);
      case 'sla':
        return this.reportSvc.generateSlaReport(filters);
    }
  }

  private handleDownload(res: HttpResponse<Blob>, type: ReportType, format: ReportFormat): void {
    const blob = res.body;
    if (!blob || blob.size === 0) {
      this.notifSvc.error('El reporte generado llegó vacío.');
      return;
    }

    const filename = this.resolveFilename(res, type, format);
    const url = URL.createObjectURL(blob);

    // Trigger the file download via a temporary anchor.
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    // Print affordance: for PDF, also open in a new tab so the user can preview/print.
    if (format === 'PDF') {
      window.open(url, '_blank');
    }

    // Revoke after a delay so the download / new tab can finish reading the blob.
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    this.notifSvc.success('Reporte generado correctamente.');
  }

  /** Prefer the server's Content-Disposition filename; fall back to a dated default. */
  private resolveFilename(res: HttpResponse<Blob>, type: ReportType, format: ReportFormat): string {
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
    const ext = format === 'PDF' ? 'pdf' : 'xlsx';
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `reporte-${type}-${stamp}.${ext}`;
  }
}
