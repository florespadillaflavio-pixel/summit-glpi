import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPassword {
  private http = inject(HttpClient);

  loading  = signal(false);
  sent     = signal(false);
  errorMsg = signal('');

  forgotForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  onSubmit(): void {
    if (this.forgotForm.invalid) { this.forgotForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.forgotForm.value.email })
      .subscribe({
        next: () => { this.loading.set(false); this.sent.set(true); },
        error: () => { this.loading.set(false); this.sent.set(true); }
      });
  }
}
