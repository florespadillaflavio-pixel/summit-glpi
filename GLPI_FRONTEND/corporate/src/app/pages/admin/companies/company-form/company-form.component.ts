import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CompanyService } from '../../../../core/services/company.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { Tenant, ReturnValue, Company } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../../shared/components/input-field/input-field';
import { phoneValidator, urlValidator, MAXLEN } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './company-form.component.html'
})
export class CompanyForm implements OnInit {
  private fb = inject(FormBuilder);
  private companySvc = inject(CompanyService);
  private notifSvc = inject(NotificationService);

  // Inputs & Outputs
  tenant = input<Tenant | null>(null);
  close = output<void>();
  saved = output<void>();

  // State
  loading = signal(false);
  saving = signal(false);
  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);

  tenantForm: FormGroup = this.fb.group({
    name:    ['', [Validators.required, Validators.minLength(2), Validators.maxLength(MAXLEN.NAME)]],
    ruc:     ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
    website: ['', [Validators.required, urlValidator]],
    email:   ['', [Validators.required, Validators.email, Validators.maxLength(MAXLEN.GENERIC)]],
    phone:   ['', [phoneValidator]],
    address: ['', [Validators.maxLength(MAXLEN.GENERIC)]],
    logoUrl: ['']
  });

  ngOnInit() {
    const data = this.tenant();
    if (data) {
      this.loading.set(true);
      this.companySvc.getById(data.id).subscribe({
        next: (res: ReturnValue<Company>) => {
          if (res.success && res.data) {
            const c = res.data;
            this.tenantForm.patchValue({
              name: c.name,
              ruc: c.ruc,
              website: c.website || '',
              email: c.email,
              phone: c.phone || '',
              address: c.address || '',
              logoUrl: c.logoUrl || ''
            });
            if (c.logoUrl) this.previewUrl.set(c.logoUrl);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  onClose() {
    this.close.emit();
  }

  isFieldInvalid(field: string) {
    const ctrl = this.tenantForm.get(field);
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  getFieldError(name: string): string | null {
    const control = this.tenantForm.get(name);
    if (!control || !control.touched || !control.errors) return null;
    if (control.hasError('required')) return 'Obligatorio';
    if (control.hasError('email')) return 'Email inválido';
    if (control.hasError('phone')) return 'Teléfono inválido';
    if (control.hasError('url')) return 'URL inválida (incluya http:// o https://)';
    if (control.hasError('maxlength')) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    if (control.hasError('pattern')) return 'RUC inválido (11 dígitos)';
    return 'Inválido';
  }

  onUploadLogo(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.selectedFile = file;
    // Local preview
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  saveTenant() {
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.tenantForm.value;
    const current = this.tenant();

    if (current) {
      const payload = { 
        ...val, 
        id: current.id,
        isOwner: current.isOwner,
        isActive: current.isActive
      };
      this.companySvc.update(current.id, payload, this.selectedFile || undefined).subscribe({
        next: (res: ReturnValue) => {
          if (res.success) {
            this.notifSvc.success(res.message || 'Datos actualizados');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message);
          }
          this.saving.set(false);
        },
        error: () => {
          this.notifSvc.error('Error al actualizar');
          this.saving.set(false);
        }
      });
    } else {
      this.companySvc.create(val, this.selectedFile || undefined).subscribe({
        next: (res: ReturnValue) => {
          if (res.success) {
            this.notifSvc.success(res.message || 'Empresa creada');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message);
          }
          this.saving.set(false);
        },
        error: () => {
          this.notifSvc.error('Error al registrar');
          this.saving.set(false);
        }
      });
    }
  }
}
