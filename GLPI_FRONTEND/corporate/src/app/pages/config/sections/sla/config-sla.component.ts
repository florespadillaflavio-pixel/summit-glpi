import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';
import { minGteValidator } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-config-sla',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './config-sla.component.html'
})
export class ConfigSla implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  loading = signal(false);
  saving = signal(false);

  slaForm = new FormGroup({
    defaultResponseTime: new FormControl(4, [Validators.required, Validators.min(1), Validators.max(720)]),
    defaultResolveTime:  new FormControl(24, [Validators.required, Validators.min(1), Validators.max(2160)]),
    businessHoursOnly:   new FormControl(true),
  }, { validators: minGteValidator('defaultResponseTime', 'defaultResolveTime') });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('SLA').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.slaForm.patchValue({
            defaultResponseTime: Number(this.findVal(cfg, 'SLA_DEFAULT_RESPONSE', '4')),
            defaultResolveTime:  Number(this.findVal(cfg, 'SLA_DEFAULT_RESOLVE', '24')),
            businessHoursOnly:   this.findVal(cfg, 'SLA_BUSINESS_HOURS', 'true') === 'true',
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
    const ctrl = this.slaForm.get(name);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return '';
    if (ctrl.hasError('required')) return 'Obligatorio';
    if (ctrl.hasError('min') || ctrl.hasError('max')) return 'Fuera de rango';
    return 'Inválido';
  }

  rangeError(): string {
    const g = this.slaForm;
    return (g.touched || g.dirty) && g.hasError('rangeOrder')
      ? 'El tiempo de resolución debe ser mayor o igual al de respuesta'
      : '';
  }

  onSave() {
    if (this.slaForm.invalid) {
      this.slaForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const sv = this.slaForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'SLA', configKey: 'SLA_DEFAULT_RESPONSE', configValue: String(sv.defaultResponseTime), valueType: 'NUMBER', description: 'Tiempo de respuesta base (h)', isSensitive: false },
      { configGroup: 'SLA', configKey: 'SLA_DEFAULT_RESOLVE',  configValue: String(sv.defaultResolveTime),  valueType: 'NUMBER', description: 'Tiempo de resolución base (h)', isSensitive: false },
      { configGroup: 'SLA', configKey: 'SLA_BUSINESS_HOURS',   configValue: String(sv.businessHoursOnly),   valueType: 'BOOLEAN', description: 'Contar solo horas hábiles', isSensitive: false },
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
            if (anyError) this.notifSvc.error('Error al guardar SLA');
            else this.notifSvc.success('Políticas SLA actualizadas');
          }
        }
      });
    });
  }
}
