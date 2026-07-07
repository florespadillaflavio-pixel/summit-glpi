import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';

@Component({
  selector: 'app-config-general',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './config-general.component.html'
})
export class ConfigGeneral implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  loading = signal(false);
  saving = signal(false);

  generalForm = new FormGroup({
    companyName: new FormControl('', [Validators.minLength(2)]),
    domain:      new FormControl('', [Validators.pattern(/^([a-z0-9-]+\.)+[a-z]{2,}$/i)]),
    timezone:    new FormControl('America/Lima (UTC-5)', [Validators.required]),
    language:    new FormControl('es', [Validators.required]),
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('GENERAL').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.generalForm.patchValue({
            companyName: this.findVal(cfg, 'GEN_COMPANY_NAME'),
            domain:      this.findVal(cfg, 'GEN_DOMAIN'),
            timezone:    this.findVal(cfg, 'GEN_TIMEZONE', 'America/Lima (UTC-5)'),
            language:    this.findVal(cfg, 'GEN_LANGUAGE', 'es'),
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
    const ctrl = this.generalForm.get(name);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return '';
    if (ctrl.hasError('minlength')) return 'Mínimo 2 caracteres';
    if (ctrl.hasError('pattern')) return 'Formato inválido';
    return 'Inválido';
  }

  onSave() {
    if (this.generalForm.invalid) {
      this.generalForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const gv = this.generalForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'GENERAL', configKey: 'GEN_COMPANY_NAME', configValue: gv.companyName!, valueType: 'STRING', description: 'Nombre visual de la empresa', isSensitive: false },
      { configGroup: 'GENERAL', configKey: 'GEN_DOMAIN',       configValue: gv.domain!,      valueType: 'STRING', description: 'Dominio del tenant', isSensitive: false },
      { configGroup: 'GENERAL', configKey: 'GEN_TIMEZONE',     configValue: gv.timezone!,    valueType: 'STRING', description: 'Zona horaria', isSensitive: false },
      { configGroup: 'GENERAL', configKey: 'GEN_LANGUAGE',     configValue: gv.language!,    valueType: 'STRING', description: 'Idioma principal', isSensitive: false },
    ];

    let pending = configs.length;
    let anyError = false;
    let lastMsg = '';

    configs.forEach(c => {
      this.configSvc.save(c).subscribe({
        next: (res) => {
          lastMsg = res.message;
          if (!res.success) anyError = true;
        },
        error: () => anyError = true,
        complete: () => {
          if (--pending === 0) {
            this.saving.set(false);
            if (anyError) this.notifSvc.error('Error al guardar algunos cambios');
            else this.notifSvc.success(lastMsg || 'Configuración general actualizada');
          }
        }
      });
    });
  }
}
