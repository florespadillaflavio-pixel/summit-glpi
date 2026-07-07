import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';

@Component({
  selector: 'app-config-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './config-notifications.component.html'
})
export class ConfigNotifications implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  loading = signal(false);
  saving = signal(false);

  notifForm = new FormGroup({
    notifyNewTicket:     new FormControl(true),
    notifyTicketUpdate:  new FormControl(true),
    notifyTicketResolve: new FormControl(true),
    notifySlaRisk:       new FormControl(true),
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('NOTIF').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.notifForm.patchValue({
            notifyNewTicket:     this.findVal(cfg, 'NOTIF_NEW_TICKET', 'true') === 'true',
            notifyTicketUpdate:  this.findVal(cfg, 'NOTIF_UPDATE_TICKET', 'true') === 'true',
            notifyTicketResolve: this.findVal(cfg, 'NOTIF_RESOLVE_TICKET', 'true') === 'true',
            notifySlaRisk:       this.findVal(cfg, 'NOTIF_SLA_RISK', 'true') === 'true',
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

  onSave() {
    this.saving.set(true);
    const sv = this.notifForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'NOTIF', configKey: 'NOTIF_NEW_TICKET',     configValue: String(sv.notifyNewTicket),     valueType: 'BOOLEAN', description: 'Notificar nuevo ticket', isSensitive: false },
      { configGroup: 'NOTIF', configKey: 'NOTIF_UPDATE_TICKET',  configValue: String(sv.notifyTicketUpdate),  valueType: 'BOOLEAN', description: 'Notificar actualizaciones', isSensitive: false },
      { configGroup: 'NOTIF', configKey: 'NOTIF_RESOLVE_TICKET', configValue: String(sv.notifyTicketResolve), valueType: 'BOOLEAN', description: 'Notificar resolución', isSensitive: false },
      { configGroup: 'NOTIF', configKey: 'NOTIF_SLA_RISK',       configValue: String(sv.notifySlaRisk),       valueType: 'BOOLEAN', description: 'Notificar riesgo SLA', isSensitive: false },
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
            if (anyError) this.notifSvc.error('Error al guardar notificaciones');
            else this.notifSvc.success('Preferencias de notificación guardadas');
          }
        }
      });
    });
  }
}
