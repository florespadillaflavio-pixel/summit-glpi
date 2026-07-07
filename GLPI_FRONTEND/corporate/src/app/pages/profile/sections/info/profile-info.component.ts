import { Component, inject, signal, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { TokenService } from '../../../../core/services/token.service';
import { ReturnValue, UserSession } from '../../../../core/models';
import { MAXLEN, phoneValidator, nombrePatternValidator, getControlError } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-info.component.html'
})
export class ProfileInfo implements OnInit {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);

  user = input<UserSession | null>(null);

  infoLoading = signal(false);
  infoSuccess = signal(false);
  infoError = signal('');

  infoForm = new FormGroup({
    firstName: new FormControl('', [Validators.maxLength(MAXLEN.NAME), nombrePatternValidator]),
    lastName:  new FormControl('', [Validators.maxLength(MAXLEN.NAME), nombrePatternValidator]),
    email:     new FormControl('', [Validators.required, Validators.email]),
    phone:     new FormControl('', [phoneValidator]),
    position:  new FormControl('', [Validators.maxLength(MAXLEN.NAME)]),
  });

  getFieldError(controlName: string, label: string): string {
    return getControlError(this.infoForm.get(controlName), label);
  }

  ngOnInit() {
    const data = this.user();
    if (data) {
      this.infoForm.patchValue({
        firstName: data.firstName ?? '',
        lastName:  data.lastName  ?? '',
        email:     data.username  ?? '',
        phone:     '',
        position:  '',
      });
    }
  }

  onSave() {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.infoLoading.set(true);
    this.infoSuccess.set(false);
    this.infoError.set('');

    const data = this.user();
    this.http.put<ReturnValue<UserSession>>(`${environment.apiUrl}/user/${data?.userId}`, this.infoForm.value)
      .subscribe({
        next: (res) => {
          this.infoLoading.set(false);
          if (res?.success === false) {
            this.infoError.set(res.message ?? 'No se pudo guardar');
          } else {
            this.infoSuccess.set(true);
            const updated = { ...data, ...this.infoForm.value } as UserSession;
            this.tokenService.setUser(updated);
            setTimeout(() => this.infoSuccess.set(false), 4000);
          }
        },
        error: () => {
          this.infoLoading.set(false);
          this.infoError.set('Error al guardar. Inténtalo de nuevo.');
        }
      });
  }
}
