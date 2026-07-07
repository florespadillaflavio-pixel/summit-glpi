import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto, SmtpTestDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';

@Component({
  selector: 'app-config-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './config-email.component.html'
})
export class ConfigEmail implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  smtpTested = signal(false);
  smtpOk = signal(false);
  loading = signal(false);
  saving = signal(false);

  smtpForm = new FormGroup({
    host:      new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    port:      new FormControl<number>(587, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(65535)] }),
    user:      new FormControl('', { nonNullable: true }),
    password:  new FormControl('', { nonNullable: true }),
    fromName:  new FormControl('', { nonNullable: true }),
    fromEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    enableSsl: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('MAIL').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.smtpForm.patchValue({
            host:      this.findVal(cfg, 'MAIL_SMTP_HOST'),
            port:      Number(this.findVal(cfg, 'MAIL_SMTP_PORT', '587')),
            user:      this.findVal(cfg, 'MAIL_SMTP_USER'),
            password:  this.findVal(cfg, 'MAIL_SMTP_PASS'),
            fromName:  this.findVal(cfg, 'MAIL_FROM_NAME'),
            fromEmail: this.findVal(cfg, 'MAIL_FROM_EMAIL'),
            enableSsl: this.findVal(cfg, 'MAIL_SMTP_SSL', 'true') === 'true',
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
    const ctrl = this.smtpForm.get(name);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return '';
    if (ctrl.hasError('required')) return 'Este campo es obligatorio';
    if (ctrl.hasError('email')) return 'Correo inválido';
    if (ctrl.hasError('min') || ctrl.hasError('max')) return 'Puerto inválido';
    return 'Inválido';
  }

  onSave() {
    if (this.smtpForm.invalid) {
      this.smtpForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const sv = this.smtpForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'MAIL', configKey: 'MAIL_SMTP_HOST', configValue: sv.host || '', valueType: 'STRING', description: 'Servidor SMTP', isSensitive: false },
      { configGroup: 'MAIL', configKey: 'MAIL_SMTP_PORT', configValue: String(sv.port || 587), valueType: 'NUMBER', description: 'Puerto SMTP', isSensitive: false },
      { configGroup: 'MAIL', configKey: 'MAIL_SMTP_USER', configValue: sv.user || '', valueType: 'STRING', description: 'Usuario SMTP', isSensitive: false },
      { configGroup: 'MAIL', configKey: 'MAIL_SMTP_PASS', configValue: sv.password || '', valueType: 'STRING', description: 'Contraseña SMTP', isSensitive: true },
      { configGroup: 'MAIL', configKey: 'MAIL_FROM_NAME', configValue: sv.fromName || '', valueType: 'STRING', description: 'Nombre remitente', isSensitive: false },
      { configGroup: 'MAIL', configKey: 'MAIL_FROM_EMAIL', configValue: sv.fromEmail || '', valueType: 'STRING', description: 'Email remitente', isSensitive: false },
      { configGroup: 'MAIL', configKey: 'MAIL_SMTP_SSL', configValue: String(sv.enableSsl ?? true), valueType: 'BOOLEAN', description: 'Usar TLS/SSL SMTP', isSensitive: false },
    ];

    let pending = configs.length;
    let anyError = false;
    let lastMsg = '';

    configs.forEach(c => {
      if (c.configValue === '********') {
        if (--pending === 0) {
            this.saving.set(false);
            if (!anyError) this.notifSvc.success(lastMsg || 'Configuración guardada');
        }
        return;
      }

      this.configSvc.save(c).subscribe({
        next: (res) => {
          lastMsg = res.message;
          if (!res.success) anyError = true;
        },
        error: () => anyError = true,
        complete: () => {
          if (--pending === 0) {
            this.saving.set(false);
            if (anyError) this.notifSvc.error('Error al guardar algunos campos');
            else this.notifSvc.success(lastMsg || 'Configuración de correo actualizada');
          }
        }
      });
    });
  }

  onTestSmtp() {
    if (this.smtpForm.invalid) {
      this.smtpForm.markAllAsTouched();
      return;
    }

    this.smtpTested.set(false);
    const sv = this.smtpForm.getRawValue();
    const testDto: SmtpTestDto = {
        host: sv.host,
        port: sv.port,
        user: sv.user,
        pass: sv.password,
        to:   sv.fromEmail,
        enableSsl: sv.enableSsl
    };

    this.configSvc.testSmtp(testDto).subscribe({
      next: (res) => {
        this.smtpTested.set(true);
        this.smtpOk.set(res.success);
        if (res.success) this.notifSvc.success(res.message);
        else this.notifSvc.error(res.message);
      },
      error: () => {
        this.smtpTested.set(true);
        this.smtpOk.set(false);
        this.notifSvc.error('Error de conexión con el servidor de correo');
      },
    });
  }
}
