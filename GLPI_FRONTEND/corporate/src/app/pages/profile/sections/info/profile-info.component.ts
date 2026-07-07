import { Component, inject, signal, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TokenService } from '../../../../core/services/token.service';
import { UserService } from '../../../../core/services/user.service';
import { UserSession, UserDetails, UserCreateUpdateDto } from '../../../../core/models';
import { MAXLEN, phoneValidator, nombrePatternValidator, getControlError } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-info.component.html'
})
export class ProfileInfo implements OnInit {
  private userSvc = inject(UserService);
  private tokenService = inject(TokenService);

  user = input<UserSession | null>(null);

  /** Full user loaded from the backend; source of truth for companyId + roleIds on save. */
  private loadedUser = signal<UserDetails | null>(null);

  infoLoading = signal(false);
  infoSuccess = signal(false);
  infoError = signal('');

  infoForm = new FormGroup({
    firstName: new FormControl('', [Validators.maxLength(MAXLEN.NAME), nombrePatternValidator]),
    lastName:  new FormControl('', [Validators.maxLength(MAXLEN.NAME), nombrePatternValidator]),
    email:     new FormControl('', [Validators.required, Validators.email]),
    phone:     new FormControl('', [phoneValidator]),
    // 'position' has no backend field: kept in the form for UX, never sent.
    position:  new FormControl('', [Validators.maxLength(MAXLEN.NAME)]),
  });

  getFieldError(controlName: string, label: string): string {
    return getControlError(this.infoForm.get(controlName), label);
  }

  ngOnInit() {
    const session = this.user();
    // Fast prefill from the session while the full profile loads.
    if (session) {
      this.infoForm.patchValue({
        firstName: session.firstName ?? '',
        lastName:  session.lastName  ?? '',
        email:     session.username  ?? '',
      });
    }
    const userId = session?.userId;
    if (!userId) return;

    // Load the full user so we preserve companyId/roleIds on save (endpoint is [FromForm]).
    this.userSvc.getById(userId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const u = res.data;
          this.loadedUser.set(u);
          this.infoForm.patchValue({
            firstName: u.firstName ?? '',
            lastName:  u.lastName  ?? '',
            email:     u.username  ?? '',
            phone:     u.phone     ?? '',
          });
        }
      },
      error: () => { /* keep the session prefill */ }
    });
  }

  onSave() {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }

    const session = this.user();
    const loaded = this.loadedUser();
    if (!session?.userId) {
      this.infoError.set('No se pudo identificar al usuario.');
      return;
    }

    this.infoLoading.set(true);
    this.infoSuccess.set(false);
    this.infoError.set('');

    const v = this.infoForm.value;
    const dto: UserCreateUpdateDto = {
      companyId: loaded?.companyId ?? session.companyId,
      firstName: v.firstName ?? '',
      lastName:  v.lastName  ?? '',
      username:  v.email     ?? '',
      phone:     v.phone     ?? '',
      roleIds:   loaded?.roleIds ?? [],
    };

    this.userSvc.update(session.userId, dto).subscribe({
      next: (res) => {
        this.infoLoading.set(false);
        if (res?.success === false) {
          this.infoError.set(res.message ?? 'No se pudo guardar');
        } else {
          this.infoSuccess.set(true);
          const updated: UserSession = {
            ...session,
            firstName: dto.firstName,
            lastName:  dto.lastName,
            username:  dto.username,
          };
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
