import { Component, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigGeneral } from '../sections/general/config-general.component';
import { ConfigEmail } from '../sections/email/config-email.component';
import { ConfigSla } from '../sections/sla/config-sla.component';
import { ConfigNotifications } from '../sections/notifications/config-notifications.component';
import { ConfigSecurity } from '../sections/security/config-security.component';
import { ConfigAI } from '../sections/ai/config-ai.component';
import { ConfigStorage } from '../sections/storage/config-storage.component';

interface ConfigSection { id: string; icon: string; label: string; }

@Component({
  selector: 'app-config-shell',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, 
    LucideAngularModule,
    ConfigGeneral,
    ConfigEmail,
    ConfigSla,
    ConfigNotifications,
    ConfigSecurity,
    ConfigAI,
    ConfigStorage
  ],
  templateUrl: './config-shell.component.html'
})
export class ConfigShell {
  activeSection = signal('general');

  sections: ConfigSection[] = [
    { id: 'general',       icon: 'globe',        label: 'General' },
    { id: 'email',         icon: 'mail',         label: 'Correo SMTP' },
    { id: 'ai',            icon: 'zap',          label: 'Servicios IA' },
    { id: 'storage',       icon: 'cloud-upload', label: 'Almacenamiento' },
    { id: 'sla',           icon: 'clock',        label: 'Políticas SLA' },
    { id: 'notifications', icon: 'bell',         label: 'Notificaciones' },
    { id: 'security',      icon: 'shield',       label: 'Seguridad' },
  ];
}
