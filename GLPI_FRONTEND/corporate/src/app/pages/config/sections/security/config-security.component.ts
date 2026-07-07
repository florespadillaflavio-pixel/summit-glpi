import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';

@Component({
  selector: 'app-config-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './config-security.component.html'
})
export class ConfigSecurity implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  loading = signal(false);
  saving = signal(false);

  securityForm = new FormGroup({
    requireMfa:           new FormControl(false),
    passwordMinLength:    new FormControl(8, [Validators.required, Validators.min(6), Validators.max(64)]),
    sessionTimeoutMins:   new FormControl(60, [Validators.required, Validators.min(5), Validators.max(1440)]),
    maxLoginAttempts:     new FormControl(5, [Validators.required, Validators.min(1), Validators.max(20)]),
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('SEC').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.securityForm.patchValue({
            requireMfa:         this.findVal(cfg, 'SEC_REQUIRE_MFA', 'false') === 'true',
            passwordMinLength:  Number(this.findVal(cfg, 'SEC_PWD_MIN_LEN', '8')),
            sessionTimeoutMins: Number(this.findVal(cfg, 'SEC_SESSION_TO', '60')),
            maxLoginAttempts:   Number(this.findVal(cfg, 'SEC_MAX_ATTEMPTS', '5')),
          });
        }
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false)
    });
  }

  findVal(list: TenantConfig[], key: string, def: string = ''): string {
    return list.find(x => x.configKey === key)?.configValue ?? def;
  }

  fieldError(name: string): string {
    const ctrl = this.securityForm.get(name);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return '';
    if (ctrl.hasError('required')) return 'Obligatorio';
    if (ctrl.hasError('min') || ctrl.hasError('max')) return 'Fuera de rango';
    return 'Inválido';
  }

  onSave() {
    if (this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const sv = this.securityForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'SEC', configKey: 'SEC_REQUIRE_MFA',    configValue: String(sv.requireMfa),          valueType: 'BOOLEAN', description: 'Requerir MFA', isSensitive: false },
      { configGroup: 'SEC', configKey: 'SEC_PWD_MIN_LEN',    configValue: String(sv.passwordMinLength),   valueType: 'NUMBER',  description: 'Longitud mínima pwd', isSensitive: false },
      { configGroup: 'SEC', configKey: 'SEC_SESSION_TO',     configValue: String(sv.sessionTimeoutMins),  valueType: 'NUMBER',  description: 'Timeout sesión (m)', isSensitive: false },
      { configGroup: 'SEC', configKey: 'SEC_MAX_ATTEMPTS',   configValue: String(sv.maxLoginAttempts),    valueType: 'NUMBER',  description: 'Intentos máximos', isSensitive: false },
    ];

    let pending = configs.length;
    let anyError = false;

    configs.forEach(c => {
      this.configSvc.save(c).subscribe({
        next: (res) => { if (!res.success) anyError = true; },
        error: () => anyError = true,
        complete: () => {
          if (--pending === 0) {
            this.saving.set(false);
            if (anyError) this.notifSvc.error('Error al guardar seguridad');
            else this.notifSvc.success('Políticas de seguridad actualizadas');
          }
        }
      });
    });
  }
}
