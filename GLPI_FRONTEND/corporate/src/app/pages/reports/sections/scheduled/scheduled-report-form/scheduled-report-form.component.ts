import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ReportService } from '../../../../../core/services/report.service';
import { NotificationService } from '../../../../../core/services/ui/notification.service';
import { ReturnValue, ScheduledReport, ScheduledReportPayload } from '../../../../../core/models';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../../../shared/components/input-field/input-field';
import { MAXLEN } from '../../../../../core/validators/app-validators';

/** Loose email shape check applied to each recipient token. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits a comma / semicolon / whitespace separated list into trimmed tokens. */
function splitRecipients(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  return String(value)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Valid when empty (let `required` own emptiness) OR every token in the
 * comma/list-separated value looks like an email. Fails with `{ emails: true }`.
 */
const emailListValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  const parts = splitRecipients(value);
  if (parts.length === 0) {
    return null;
  }
  return parts.every((p) => EMAIL_RE.test(p)) ? null : { emails: true };
};

@Component({
  selector: 'app-scheduled-report-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './scheduled-report-form.component.html'
})
export class ScheduledReportForm implements OnInit {
  private fb = inject(FormBuilder);
  private reportSvc = inject(ReportService);
  private notifSvc = inject(NotificationService);

  // Inputs & Outputs
  report = input<ScheduledReport | null>(null);
  close = output<void>();
  saved = output<void>();

  // State
  saving = signal(false);

  scheduleForm: FormGroup = this.fb.group({
    name:       ['', [Validators.required, Validators.maxLength(MAXLEN.TITLE)]],
    reportType: ['', [Validators.required]],
    frequency:  ['WEEKLY', [Validators.required]],
    recipients: ['', [Validators.required, emailListValidator]],
    format:     ['PDF', [Validators.required]],
    nextRunAt:  [''],
    isActive:   [true]
  });

  ngOnInit(): void {
    const r = this.report();
    if (r) {
      this.scheduleForm.patchValue({
        name: r.name ?? '',
        reportType: r.reportType ?? '',
        frequency: r.frequency ?? 'WEEKLY',
        recipients: (r.recipients ?? []).join(', '),
        format: r.format ?? 'PDF',
        nextRunAt: this.toDateInput(r.nextRunAt),
        isActive: r.isActive ?? true
      });
    }
  }

  /** Converts an ISO datetime (or null) to a `YYYY-MM-DD` value for the date input. */
  private toDateInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return String(value).slice(0, 10);
  }

  onClose(): void {
    this.close.emit();
  }

  getFieldError(name: string): string | null {
    const control = this.scheduleForm.get(name);
    if (!control || !control.touched || !control.errors) {
      return null;
    }
    if (control.hasError('required')) return 'Obligatorio';
    if (control.hasError('emails')) return 'Uno o más correos son inválidos';
    if (control.hasError('maxlength')) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    return 'Inválido';
  }

  save(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.scheduleForm.value;
    const payload: ScheduledReportPayload = {
      name: String(raw.name).trim(),
      reportType: raw.reportType,
      frequency: raw.frequency,
      recipients: splitRecipients(raw.recipients),
      format: raw.format,
      nextRunAt: raw.nextRunAt ? raw.nextRunAt : null,
      isActive: !!raw.isActive
    };

    const current = this.report();
    const request$ = current
      ? this.reportSvc.updateScheduledReport(current.id, payload)
      : this.reportSvc.createScheduledReport(payload);

    request$.subscribe({
      next: (res: ReturnValue) => {
        if (res.success) {
          this.notifSvc.success(res.message || (current ? 'Reporte actualizado' : 'Reporte programado'));
          this.saved.emit();
          this.onClose();
        } else {
          this.notifSvc.error(res.message);
        }
        this.saving.set(false);
      },
      error: () => {
        this.notifSvc.error(current ? 'Error al actualizar el reporte' : 'Error al programar el reporte');
        this.saving.set(false);
      }
    });
  }
}
