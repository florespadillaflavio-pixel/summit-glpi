import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ReturnValue, LoginResponse } from '../../../core/models';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, InputFieldComponent],
  templateUrl: './login.component.html'
})
export class Login {
  private authSvc = inject(AuthService);
  private router  = inject(Router);

  loading  = signal(false);
  showPwd  = signal(false);
  errorMsg = signal('');

  features = [
    'Gestión de tickets y SLA',
    'Inventario CMDB completo',
    'Base de conocimiento',
    'Contratos y activos',
    'Reportes y auditoría',
  ];

  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  field(name: string) { return this.loginForm.get(name)!; }

  getFieldError(name: string): string | null {
    const control = this.loginForm.get(name);
    if (!control || !control.touched || !control.errors) return null;
    
    if (control.hasError('required')) return 'Este campo es obligatorio';
    if (control.hasError('email')) return 'Correo electrónico inválido';
    if (control.hasError('minlength')) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    
    return 'Campo inválido';
  }

  onLogin() {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    this.authSvc.login({
      username: this.loginForm.value.username ?? '',
      password: this.loginForm.value.password ?? ''
    }).subscribe({
      next: (res: ReturnValue<LoginResponse>) => {
        this.loading.set(false);
        if (res.success) {
          if (res.data?.mustChangePassword || !res.data?.token) this.router.navigate(['/auth/change-password']);
          else this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg.set(res.message ?? 'Credenciales incorrectas');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'No se pudo conectar con el servidor.');
      }
    });
  }
}
