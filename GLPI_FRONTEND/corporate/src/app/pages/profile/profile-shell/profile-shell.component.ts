import { Component, inject, signal, computed, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TokenService } from '../../../core/services/token.service';
import { ProfileInfo } from '../sections/info/profile-info.component';
import { ProfileSecurity } from '../sections/security/profile-security.component';
import { ProfileSessions } from '../sections/sessions/profile-sessions.component';
import { UserSession } from '../../../core/models';

@Component({
  selector: 'app-profile-shell',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, 
    LucideAngularModule,
    ProfileInfo,
    ProfileSecurity,
    ProfileSessions
  ],
  templateUrl: './profile-shell.component.html'
})
export class ProfileShell implements OnInit {
  private tokenService = inject(TokenService);

  activeTab = signal<'info' | 'security' | 'sessions'>('info');
  userData = signal<UserSession | null>(null);

  fullName = computed(() => {
    const u = this.userData();
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username : '—';
  });

  initials = computed(() => {
    const name = this.fullName();
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + (parts[1][0] || '')).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  });

  userRole = computed(() => {
    const u = this.userData();
    const map: Record<string, string> = { ADMIN: 'Administrador', TECHNICIAN: 'Técnico', CLIENT: 'Cliente' };
    return map[u?.role ?? ''] ?? u?.role ?? 'Usuario';
  });

  userEmail = computed(() => this.userData()?.username ?? '');
  companyLabel = computed(() => this.userData()?.companyName || 'Summit Consulting');
  avatarColor = signal('var(--navy-700)');

  ngOnInit(): void {
    this.userData.set(this.tokenService.getUser());
  }
}
