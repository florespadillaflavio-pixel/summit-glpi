import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { changePasswordGuard } from './core/guards/change-password.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.Login)
  },
  {
    path: 'auth/forgot-password',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPassword)
  },
  {
    path: 'auth/change-password',
    canActivate: [changePasswordGuard],
    loadComponent: () => import('./pages/auth/change-password/change-password.component').then(m => m.ChangePassword)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layouts/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard-view/dashboard-view.component').then(m => m.DashboardView)
      },
      // Mesa de Ayuda
      {
        path: 'tickets',
        canActivate: [permissionGuard],
        data: { permission: 'TICKET_VIEW' },
        loadComponent: () => import('./pages/tickets/ticket-list/ticket-list.component').then(m => m.TicketList)
      },
      {
        path: 'tickets/new',
        canActivate: [permissionGuard],
        data: { permission: 'TICKET_CREATE' },
        loadComponent: () => import('./pages/tickets/ticket-create/ticket-create.component').then(m => m.TicketCreate)
      },
      {
        path: 'tickets/:id',
        canActivate: [permissionGuard],
        data: { permission: 'TICKET_VIEW' },
        loadComponent: () => import('./pages/tickets/ticket-detail/ticket-detail.component').then(m => m.TicketDetail)
      },
      // Base de Conocimiento
      {
        path: 'kb',
        canActivate: [permissionGuard],
        data: { permission: 'KB_VIEW' },
        loadComponent: () => import('./pages/kb/kb-view/kb-view.component').then(m => m.KbView)
      },
      // Inventario / CMDB
      {
        path: 'cmdb',
        canActivate: [permissionGuard],
        data: { permission: 'ASSET_VIEW' },
        loadComponent: () => import('./pages/cmdb/asset-list/asset-list.component').then(m => m.AssetList)
      },
      // Contratos
      {
        path: 'contracts',
        canActivate: [permissionGuard],
        data: { permission: 'CONTRACT_VIEW' },
        loadComponent: () => import('./pages/contracts/contract-list/contract-list.component').then(m => m.ContractList)
      },
      // Reportes
      {
        path: 'reports',
        canActivate: [permissionGuard],
        data: { permission: 'REPORT_VIEW' },
        loadComponent: () => import('./pages/reports/report-shell/report-shell.component').then(m => m.ReportShell)
      },
      // Configuración
      {
        path: 'admin/config',
        canActivate: [permissionGuard],
        data: { permission: 'CONFIG_VIEW' },
        loadComponent: () => import('./pages/config/config-shell/config-shell.component').then(m => m.ConfigShell)
      },
      // Perfil
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile-shell/profile-shell.component').then(m => m.ProfileShell)
      },
      // Administración
      {
        path: 'admin/users',
        canActivate: [permissionGuard],
        data: { permission: 'USER_VIEW' },
        loadComponent: () => import('./pages/admin/users/list-users/list-users.component').then(m => m.ListUsers)
      },
      {
        path: 'admin/roles',
        canActivate: [permissionGuard],
        data: { permission: 'ROLE_VIEW' },
        loadComponent: () => import('./pages/admin/roles/list-roles/list-roles.component').then(m => m.ListRoles)
      },
      {
        path: 'admin/companies',
        canActivate: [permissionGuard],
        data: { permission: 'COMPANY_VIEW' },
        loadComponent: () => import('./pages/admin/companies/list-companies/list-companies.component').then(m => m.ListCompanies)
      },
      {
        path: 'admin/catalogs',
        canActivate: [permissionGuard],
        data: { permission: 'CATALOG_VIEW' },
        loadComponent: () => import('./pages/admin/catalogs/list-catalogs/list-catalogs.component').then(m => m.ListCatalogs)
      },
      {
        path: 'admin/audit',
        canActivate: [permissionGuard],
        data: { permission: 'AUDIT_VIEW' },
        loadComponent: () => import('./pages/audit/audit-list/audit-list.component').then(m => m.AuditList)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
