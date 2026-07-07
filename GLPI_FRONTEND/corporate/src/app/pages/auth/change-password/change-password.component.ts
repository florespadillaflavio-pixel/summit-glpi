import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { TokenService } from '../../../core/services/token.service';
import { ReturnValue, LoginResponse } from '../../../core/models';

const notSameAsCurrent: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const current  = group.get('currentPassword')?.value ?? '';
  const newPwd   = group.get('newPassword')?.value ?? '';
  return newPwd && current && newPwd === current ? { sameAsCurrent: true } : null;
};

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const newPwd    = group.get('newPassword')?.value ?? '';
  const confirm   = group.get('confirmPassword')?.value ?? '';
  return confirm && newPwd !== confirm ? { passwordMismatch: true } : null;
};

const strongPassword: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
  const v = ctrl.value ?? '';
  if (!v) return null;
  const errors: Record<string, boolean> = {};
  if (v.length < 8)             errors['minLength']    = true;
  if (!/[A-Z]/.test(v))        errors['noUppercase']  = true;
  if (!/[a-z]/.test(v))        errors['noLowercase']  = true;
  if (!/[0-9]/.test(v))        errors['noNumber']     = true;
  if (!/[^A-Za-z0-9]/.test(v)) errors['noSpecial']    = true;
  return Object.keys(errors).length ? errors : null;
};

function calcStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './change-password.component.html'
})
export class ChangePassword {
  private authService  = inject(AuthService);
  private router       = inject(Router);
  private tokenService = inject(TokenService);

  loading     = signal(false);
  errorMsg    = signal('');
  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  changeForm = new FormGroup(
    {
      currentPassword:  new FormControl('', [Validators.required, Validators.minLength(6)]),
      newPassword:      new FormControl('', [Validators.required, Validators.minLength(8), strongPassword]),
      confirmPassword:  new FormControl('', Validators.required),
    },
    { validators: [notSameAsCurrent, passwordsMatch] }
  );

  strength = computed(() => calcStrength(this.changeForm.get('newPassword')?.value ?? ''));
  strengthKey = computed(() => {
    const s = this.strength();
    if (s <= 1) return 'weak';
    if (s === 2) return 'fair';
    if (s === 3) return 'good';
    return 'strong';
  });
  strengthLabel = computed(() => {
    const map: Record<string, string> = { weak: 'Débil', fair: 'Regular', good: 'Buena', strong: 'Fuerte' };
    return map[this.strengthKey()] ?? '';
  });

  f(name: string) { return this.changeForm.get(name)!; }

  onSubmit(): void {
    if (this.changeForm.invalid) { this.changeForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    const userId = this.authService.pendingChangeUserId ?? this.tokenService.getUser()?.userId ?? '';
    this.authService.changePassword(
      userId,
      this.changeForm.value.currentPassword ?? '',
      this.changeForm.value.newPassword ?? ''
    ).subscribe({
      next: (res: ReturnValue<LoginResponse>) => {
        this.loading.set(false);
        if (res?.success === false) this.errorMsg.set(res.message ?? 'No se pudo cambiar la contraseña');
        else this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al cambiar la contraseña.');
      }
    });
  }
}
