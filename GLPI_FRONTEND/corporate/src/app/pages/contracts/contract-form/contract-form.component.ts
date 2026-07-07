import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ContractService } from '../../../core/services/contract.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { Contract, CatalogItem, ReturnValue } from '../../../core/models';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field';
import { dateRangeValidator, getControlError, MAXLEN } from '../../../core/validators/app-validators';

const CURRENCIES = ['PEN', 'USD', 'EUR'] as const;

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './contract-form.component.html'
})
export class ContractForm implements OnInit {
  private fb          = inject(FormBuilder);
  private contractSvc = inject(ContractService);
  private catalogSvc  = inject(CatalogService);
  private notifSvc    = inject(NotificationService);

  // Inputs & Outputs
  contract = input<Contract | null>(null);
  close    = output<void>();
  saved    = output<void>();

  // State
  loading = signal(false);
  saving  = signal(false);

  readonly currencies = CURRENCIES;
  statuses = signal<CatalogItem[]>([]);
  types    = signal<CatalogItem[]>([]);

  contractForm: FormGroup = this.fb.group(
    {
      name:           ['', [Validators.required, Validators.maxLength(MAXLEN.TITLE)]],
      contractNumber: ['', [Validators.required, Validators.maxLength(MAXLEN.CODE)]],
      vendorName:     ['', [Validators.required, Validators.maxLength(MAXLEN.TITLE)]],
      startDate:      ['', [Validators.required]],
      endDate:        ['', [Validators.required]],
      value:          [0,  [Validators.required, Validators.min(0)]],
      currency:       ['PEN', [Validators.required, Validators.maxLength(5)]],
      statusItemId:   [''],
      typeItemId:     ['']
    },
    { validators: dateRangeValidator('startDate', 'endDate') }
  );

  ngOnInit() {
    this.loadCatalogs();

    const data = this.contract();
    if (data) {
      this.loading.set(true);
      this.contractSvc.getById(data.id).subscribe({
        next: (res: ReturnValue<Contract>) => {
          if (res.success && res.data) {
            const c = res.data;
            this.contractForm.patchValue({
              name:           c.name || '',
              contractNumber: c.contractNumber || '',
              vendorName:     c.vendorName || '',
              startDate:      (c.startDate || '').slice(0, 10),
              endDate:        (c.endDate || '').slice(0, 10),
              value:          c.value ?? 0,
              currency:       c.currency || 'PEN',
              statusItemId:   c.statusItemId || '',
              typeItemId:     c.typeItemId || ''
            });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  private loadCatalogs() {
    this.catalogSvc.getGroupItems('CONTRACT_STATUS').subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success && res.data) this.statuses.set(res.data);
      },
      error: () => this.statuses.set([])
    });
    this.catalogSvc.getGroupItems('CONTRACT_TYPE').subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success && res.data) this.types.set(res.data);
      },
      error: () => this.types.set([])
    });
  }

  onClose() {
    this.close.emit();
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.contractForm.get(field);
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  getFieldError(field: string, label: string): string {
    return getControlError(this.contractForm.get(field), label);
  }

  get dateRangeError(): boolean {
    const start = this.contractForm.get('startDate');
    const end = this.contractForm.get('endDate');
    return this.contractForm.hasError('dateRange') && !!(start?.touched || end?.touched);
  }

  save() {
    if (this.contractForm.invalid) {
      this.contractForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const v = this.contractForm.value;
    const current = this.contract();

    const payload: Partial<Contract> = {
      name:           (v.name || '').trim(),
      contractNumber: (v.contractNumber || '').trim(),
      vendorName:     (v.vendorName || '').trim(),
      startDate:      v.startDate,
      endDate:        v.endDate,
      value:          Number(v.value) || 0,
      currency:       v.currency || 'PEN'
    };
    if (v.statusItemId) payload.statusItemId = v.statusItemId;
    if (v.typeItemId) payload.typeItemId = v.typeItemId;

    const request$ = current
      ? this.contractSvc.update(current.id, { ...payload, id: current.id })
      : this.contractSvc.create(payload);

    request$.subscribe({
      next: (res: ReturnValue) => {
        if (res.success) {
          this.notifSvc.success(res.message || (current ? 'Contrato actualizado' : 'Contrato creado'));
          this.saved.emit();
          this.onClose();
        } else {
          this.notifSvc.error(res.message || 'No se pudo guardar el contrato');
        }
        this.saving.set(false);
      },
      error: () => {
        this.notifSvc.error(current ? 'Error al actualizar el contrato' : 'Error al registrar el contrato');
        this.saving.set(false);
      }
    });
  }
}
