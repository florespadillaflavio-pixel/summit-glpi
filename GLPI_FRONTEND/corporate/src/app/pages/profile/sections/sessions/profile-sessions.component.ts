import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

interface SessionInfo {
  id:         string;
  device:     string;
  deviceType: 'desktop' | 'mobile' | 'web';
  ip:         string;
  location:   string;
  lastSeen:   string;
  isCurrent:  boolean;
}

const MOCK_SESSIONS: SessionInfo[] = [
  {
    id: '1', device: 'Chrome / Windows 11',  deviceType: 'desktop',
    ip: '192.168.1.10', location: 'Lima, Perú',
    lastSeen: 'Ahora mismo', isCurrent: true
  },
  {
    id: '2', device: 'Safari / iPhone 15',   deviceType: 'mobile',
    ip: '190.232.50.22', location: 'Lima, Perú',
    lastSeen: 'Hace 2 horas', isCurrent: false
  },
  {
    id: '3', device: 'Firefox / Ubuntu 22',  deviceType: 'desktop',
    ip: '200.60.10.5', location: 'Arequipa, Perú',
    lastSeen: 'Hace 3 días', isCurrent: false
  },
];

@Component({
  selector: 'app-profile-sessions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './profile-sessions.component.html'
})
export class ProfileSessions {
  sessions = signal<SessionInfo[]>(MOCK_SESSIONS);

  onCloseSession(id: string): void {
    this.sessions.update(list => list.filter(s => s.id !== id));
  }
}
