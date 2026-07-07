import { Component, inject, signal, computed, ViewEncapsulation, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../../core/services/token.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserPermission, UserSession, NavItem, NavSection } from '../../../core/models';

const ALL_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { icon: 'layout-grid',  label: 'Dashboard',          link: '/dashboard' },
      { icon: 'ticket-check', label: 'Mesa de Ayuda',      link: '/tickets',         permission: 'TICKET_VIEW' },
      { icon: 'package',      label: 'CMDB / Activos',     link: '/cmdb',            permission: 'ASSET_VIEW'  },
      { icon: 'book-open',    label: 'Base Conocimiento',  link: '/kb',              permission: 'KB_VIEW'     },
      { icon: 'file-text',    label: 'Contratos',          link: '/contracts',       permission: 'CONTRACT_VIEW'},
    ],
  },
  {
    title: 'Reportes',
    items: [
      { icon: 'bar-chart-3', label: 'Reportes', link: '/reports', permission: 'REPORT_VIEW' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { icon: 'users',     label: 'Usuarios',       link: '/admin/users',      permission: 'USER_VIEW'    },
      { icon: 'shield',    label: 'Roles',          link: '/admin/roles',      permission: 'ROLE_VIEW'    },
      { icon: 'building-2',label: 'Empresas',       link: '/admin/companies',  permission: 'COMPANY_VIEW' },
      { icon: 'tag',       label: 'Catálogos',      link: '/admin/catalogs',   permission: 'CATALOG_VIEW' },
      { icon: 'clock',     label: 'Auditoría',      link: '/admin/audit',      permission: 'AUDIT_VIEW'   },
      { icon: 'settings',  label: 'Configuración',  link: '/admin/config',     permission: 'CONFIG_VIEW'  },
    ],
  },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, RouterModule, LucideAngularModule, ReactiveFormsModule],
  template: `
    <div class="app-shell">

      <!-- ── Sidebar ─────────────────────────────────────────────────── -->
      <aside class="sm-sidebar" [class.collapsed]="collapsed()">

        <!-- Logo -->
        <div class="sm-sidebar-logo" title="Summit GLPI">
          <img src="summit_sac_logo.jpeg" alt="Logo" class="sm-sidebar-logo-img">
          <div class="sm-sidebar-logo-copy">
            <span class="sm-sidebar-logo-text">Summit GLPI</span>
            <span class="sm-sidebar-logo-sub">Service Desk</span>
          </div>
        </div>

        <!-- Avatar + datos del usuario -->
        <div class="sm-sidebar-user">
          <div class="sm-sidebar-avatar" [title]="fullName()">{{ initials() }}</div>
          <div class="sm-sidebar-user-info">
            <div class="sm-sidebar-user-name" [title]="fullName()">{{ fullName() }}</div>
            <div class="sm-sidebar-user-role">{{ roleName() }}</div>
          </div>
        </div>

        <!-- Navegación filtrada por permisos -->
        <nav class="sm-sidebar-nav">
          @for (section of visibleSections(); track section.title) {
            <div class="sm-sidebar-section">
              <div class="sm-sidebar-section-title">{{ section.title }}</div>
            </div>
            @for (item of section.items; track item.link) {
              <a class="sm-nav-item"
                 [routerLink]="item.link"
                 [title]="item.label"
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{ exact: item.link === '/dashboard' }">
                <span class="sm-nav-icon">
                  <lucide-angular [name]="item.icon" [size]="18"></lucide-angular>
                </span>
                <span class="sm-sidebar-label">{{ item.label }}</span>
                @if (item.badge && item.badge > 0) {
                  <span class="sm-nav-badge">{{ item.badge }}</span>
                }
              </a>
            }
          }
        </nav>

        <!-- Footer: logout + colapsar -->
        <div class="sm-sidebar-footer">
          <button class="sm-nav-item sm-nav-btn is-logout" (click)="logout()" title="Cerrar sesión">
            <span class="sm-nav-icon">
              <lucide-angular name="log-out" [size]="18"></lucide-angular>
            </span>
            <span class="sm-sidebar-label">Cerrar sesión</span>
          </button>
          <button class="sm-nav-item sm-nav-btn is-collapse" (click)="toggleSidebar()" [title]="collapsed() ? 'Expandir menú' : 'Minimizar menú'">
            <span class="sm-nav-icon">
              <lucide-angular [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16"></lucide-angular>
            </span>
            <span class="sm-sidebar-label">{{ collapsed() ? 'Expandir' : 'Minimizar' }}</span>
          </button>
        </div>
      </aside>

      <!-- ── Contenido principal ─────────────────────────────────────── -->
      <div class="sm-main">

        <header class="sm-topbar">
          <div class="sm-topbar-left">
            <button class="sm-topbar-btn" (click)="toggleSidebar()" aria-label="Alternar menú lateral" title="Alternar menú lateral">
              <lucide-angular name="menu" [size]="18"></lucide-angular>
            </button>
            <nav class="sm-breadcrumb">
              <span class="sm-crumb">Summit GLPI</span>
              <span class="sm-crumb-sep">/</span>
              <span class="sm-crumb">{{ currentTitle() }}</span>
            </nav>
          </div>

          <div class="sm-topbar-center">
            <div class="sm-input-wrap">
              <span class="sm-input-icon left" style="display:flex;">
                <lucide-angular name="search" [size]="15"></lucide-angular>
              </span>
              <input class="sm-input sm-compact with-icon-left"
                     placeholder="Buscar tickets, activos…"
                     [formControl]="searchCtrl">
            </div>
          </div>

          <div class="sm-topbar-right">
            <button class="sm-topbar-btn" title="Notificaciones">
              <lucide-angular name="bell" [size]="18"></lucide-angular>
              <span class="sm-notif-dot"></span>
            </button>
            <a routerLink="/profile" class="sm-topbar-btn" style="text-decoration:none;" title="Mi perfil">
              <lucide-angular name="user" [size]="18"></lucide-angular>
            </a>
            <div class="sm-tenant-chip">
              <lucide-angular name="building-2" [size]="14"></lucide-angular>
              <span>{{ tenantName() }}</span>
            </div>
          </div>
        </header>

        <main class="sm-page">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent implements OnInit {
  private tokenSvc = inject(TokenService);
  private authSvc  = inject(AuthService);
  private router   = inject(Router);

  collapsed  = signal(false);
  searchCtrl = new FormControl('');

  // Signal reactivo del usuario — se actualiza tras cada navegación
  private userData = signal<UserSession | null>(null);
  private currentUrl = signal('');

  ngOnInit() {
    // Carga inicial desde localStorage
    this.userData.set(this.tokenSvc.getUser());
    this.currentUrl.set(this.router.url);

    // Re-lee localStorage en cada navegación (por si se refrescó el perfil)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((event) => {
      this.userData.set(this.tokenSvc.getUser());
      this.currentUrl.set((event as NavigationEnd).urlAfterRedirects);
    });
  }

  // ── Datos del usuario ─────────────────────────────────────────
  fullName = computed(() => {
    const u = this.userData();
    if (!u) return '';
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '';
  });

  initials = computed(() =>
    this.fullName()
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );

  roleName = computed(() => {
    const u = this.userData();
    const map: Record<string, string> = {
      ADMIN:      'Administrador',
      TECHNICIAN: 'Técnico',
      CLIENT:     'Cliente',
      SUPERVISOR: 'Supervisor',
    };
    return map[u?.role ?? ''] ?? u?.role ?? 'Usuario';
  });

  tenantName = computed(() => {
    const u = this.userData();
    return u?.companyName ?? u?.username?.split('@')[1] ?? 'Mi empresa';
  });

  // ── Permisos: set de códigos del usuario actual ───────────────
  private userPermissions = computed<Set<string>>(() => {
    const u = this.userData();
    if (!u?.permissions?.length) return new Set();
    return new Set<string>(
      u.permissions.map((p: UserPermission | any) =>
        p.permission_Code ?? p.permissionCode ?? p.permission_code ?? ''
      )
    );
  });

  private canSee(permission?: string): boolean {
    if (!permission) return true;               // sin permiso requerido = siempre visible
    return this.userPermissions().has(permission);
  }

  // ── Secciones filtradas (computed reactivo) ───────────────────
  visibleSections = computed(() => {
    return ALL_NAV_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.canSee(item.permission)),
      }))
      .filter(section => section.items.length > 0);  // oculta secciones vacías
  });

  // ── Título del breadcrumb ─────────────────────────────────────
  currentTitle = computed(() => {
    const url = this.currentUrl();
    const map: [string, string][] = [
      ['/tickets/new',    'Nuevo Ticket'],
      ['/tickets/',       'Detalle de Ticket'],
      ['/tickets',        'Mesa de Ayuda'],
      ['/cmdb',           'CMDB / Inventario'],
      ['/kb',             'Base de Conocimiento'],
      ['/contracts',      'Contratos'],
      ['/reports',        'Reportes'],
      ['/admin/config',   'Configuración'],
      ['/admin/users',    'Usuarios'],
      ['/admin/roles',    'Roles y Permisos'],
      ['/admin/companies','Empresas'],
      ['/admin/catalogs', 'Catálogos'],
      ['/admin/audit',    'Auditoría'],
      ['/profile',        'Mi Perfil'],
      ['/dashboard',      'Dashboard'],
    ];
    return map.find(([k]) => url.startsWith(k))?.[1] ?? 'Dashboard';
  });

  toggleSidebar() { this.collapsed.update(v => !v); }

  logout() {
    this.authSvc.logout();
    this.router.navigate(['/auth/login']);
  }
}
