import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ReturnValue } from '../../../../core/models';
import { MAXLEN } from '../../../../core/validators/app-validators';

const strongPassword: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
  const v = ctrl.value ?? '';
  if (!v) return null;
  const errors: Record<string, boolean> = {};
  if (v.length < 8)      errors['minLength']   = true;
  if (!/[A-Z]/.test(v)) errors['noUppercase'] = true;
  if (!/[0-9]/.test(v)) errors['noNumber']    = true;
  return Object.keys(errors).length ? errors : null;
};

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const n = group.get('newPassword')?.value ?? '';
  const c = group.get('confirmPassword')?.value ?? '';
  return c && n !== c ? { passwordMismatch: true } : null;
};

function calcStrength(pwd: string): number {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)        s++;
  if (/[A-Z]/.test(pwd))     s++;
  if (/[0-9]/.test(pwd))     s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-security.component.html'
})
export class ProfileSecurity {
  private http = inject(HttpClient);

  secLoading = signal(false);
  secSuccess = signal(false);
  secError = signal('');

  showSecCurrent = signal(false);
  showSecNew = signal(false);
  showSecConfirm = signal(false);

  secForm = new FormGroup(
    {
      currentPassword:  new FormControl('', [Validators.required, Validators.maxLength(MAXLEN.GENERIC)]),
      newPassword:      new FormControl('', [Validators.required, Validators.maxLength(MAXLEN.GENERIC), strongPassword]),
      confirmPassword:  new FormControl('', [Validators.required, Validators.maxLength(MAXLEN.GENERIC)]),
    },
    { validators: passwordsMatch }
  );

  formValue = toSignal(this.secForm.valueChanges, { initialValue: this.secForm.value });

  secStrength = computed(() => calcStrength(this.formValue()?.newPassword ?? ''));
  secStrengthKey = computed(() => {
    const s = this.secStrength();
    if (s <= 1) return 'weak';
    if (s === 2) return 'fair';
    if (s === 3) return 'good';
    return 'strong';
  });
  secStrengthLabel = computed(() => {
    const map: Record<string, string> = { weak: 'Débil', fair: 'Regular', good: 'Buena', strong: 'Fuerte' };
    return map[this.secStrengthKey()] ?? '';
  });

  onSave(): void {
    if (this.secForm.invalid) { this.secForm.markAllAsTouched(); return; }
    this.secLoading.set(true);
    this.secSuccess.set(false);
    this.secError.set('');

    this.http.post<ReturnValue<unknown>>(`${environment.apiUrl}/auth/change-password`, {
      currentPassword: this.secForm.value.currentPassword,
      newPassword:     this.secForm.value.newPassword,
    }).subscribe({
      next: (res) => {
        this.secLoading.set(false);
        if (res?.success === false) {
          this.secError.set(res.message ?? 'No se pudo actualizar');
        } else {
          this.secSuccess.set(true);
          this.secForm.reset();
          setTimeout(() => this.secSuccess.set(false), 4000);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.secLoading.set(false);
        this.secError.set(err?.error?.message ?? 'Error al actualizar la contraseña');
      }
    });
  }
}
