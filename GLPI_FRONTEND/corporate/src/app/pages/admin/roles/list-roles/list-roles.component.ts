import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RoleService } from '../../../../core/services/role.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { RoleForm } from '../role-form/role-form.component';
import { Role, RolePermissionMatrix, Permission, PermissionModule, ReturnValue } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

// Extend Permission UI to include ID
interface UIPermission extends Permission {
  id: string;
}

interface UIPermissionModule extends PermissionModule {
  permissions: UIPermission[];
}

@Component({
  selector: 'app-list-roles',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RoleForm, ModalComponent, PaginationComponent],
  templateUrl: './list-roles.component.html'
})
export class ListRoles implements OnInit {
  private roleSvc = inject(RoleService);
  private notifSvc = inject(NotificationService);

  // State
  loading = signal(false);
  permLoading = signal(false);
  roles = signal<Role[]>([]);
  page = signal(1);
  pageSize = signal(8);
  openMenuId = signal<string>('');
  
  // Selection/Matrix
  selectedRoleId = signal<string | null>(null);
  currentPermissions = signal<UIPermissionModule[]>([]);
  activeModuleTab = signal<string | null>(null);
  savingPerms = signal(false);

  // Modals
  showRoleForm = signal(false);
  editingRole = signal<Role | null>(null);
  showDeleteConfirm = signal(false);
  roleToDelete = signal<Role | null>(null);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set('');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.roleSvc.getAll().subscribe({
      next: (res: ReturnValue<Role[]>) => {
        if (res.success && res.data) {
          this.roles.set(res.data);
          
          if (!this.selectedRoleId() && res.data.length > 0) {
            this.onSelectRole(res.data[0].id);
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSelectRole(id: string) {
    this.selectedRoleId.set(id);
    this.loadMatrix(id);
  }

  loadMatrix(roleId: string) {
    this.permLoading.set(true);
    this.roleSvc.getPermissions(roleId).subscribe({
      next: (res: ReturnValue<RolePermissionMatrix[]>) => {
        if (res.success && res.data) {
          // Mapeo defensivo para asegurar camelCase
          const mapped = res.data.map((p: any) => ({
            permissionId: p.permissionId || p.PermissionId || p.permission_id,
            permissionCode: p.permissionCode || p.PermissionCode || p.permission_code,
            permissionName: p.permissionName || p.PermissionName || p.permission_name,
            moduleName: p.moduleName || p.ModuleName || p.module_name,
            moduleIcon: p.moduleIcon || p.ModuleIcon || p.module_icon,
            granted: p.granted !== undefined ? p.granted : (p.Granted || p.granted_status)
          } as RolePermissionMatrix));
          
          const modules = this.groupPermissions(mapped);
          this.currentPermissions.set(modules);
          if (modules.length > 0) {
            // Solo establecer tab inicial si no hay uno activo o el activo no existe en el nuevo set
            if (!this.activeModuleTab() || !modules.find(m => m.module === this.activeModuleTab())) {
              this.activeModuleTab.set(modules[0].module);
            }
          }
        }
        this.permLoading.set(false);
      },
      error: () => this.permLoading.set(false)
    });
  }

  private groupPermissions(data: RolePermissionMatrix[]): UIPermissionModule[] {
    const groups: { [key: string]: UIPermissionModule } = {};
    
    data.forEach(p => {
      if (!groups[p.moduleName]) {
        groups[p.moduleName] = {
          module: p.moduleName,
          icon: p.moduleIcon || 'shield',
          permissions: []
        };
      }
      groups[p.moduleName].permissions.push({
        id: p.permissionId,
        code: p.permissionCode,
        name: p.permissionName,
        granted: p.granted
      });
    });

    return Object.values(groups);
  }

  togglePermission(moduleName: string, permCode: string) {
    if (this.selectedRole()?.isSystem) return;
    
    this.currentPermissions.update(modules => {
      return modules.map(m => {
        if (m.module === moduleName) {
          return {
            ...m,
            permissions: m.permissions.map(p => {
              if (p.code === permCode) return { ...p, granted: !p.granted };
              return p;
            })
          };
        }
        return m;
      });
    });
  }

  selectedRole = computed(() => this.roles().find(r => r.id === this.selectedRoleId()));
  pagedRoles = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.roles().slice(start, start + this.pageSize());
  });
  selectedRoleIsClient = computed(() => (this.selectedRole()?.roleType || '').toUpperCase() === 'CLIENT');
  
  activeModule = computed(() => {
    const tab = this.activeModuleTab();
    return this.currentPermissions().find(m => m.module === tab) || null;
  });

  savePermissions() {
    const roleId = this.selectedRoleId();
    if (!roleId) return;

    this.savingPerms.set(true);
    const ids = this.currentPermissions()
      .flatMap(m => m.permissions)
      .filter(p => p.granted)
      .map(p => p.id);

    this.roleSvc.setPermissions(roleId, ids).subscribe({
      next: (res: ReturnValue) => {
        if (res.success) {
          this.notifSvc.success('Permisos actualizados correctamente.');
        } else {
          this.notifSvc.error(res.message);
        }
        this.savingPerms.set(false);
      },
      error: () => {
        this.notifSvc.error('Error al conectar con el servidor.');
        this.savingPerms.set(false);
      }
    });
  }

  onRestorePermissions() {
    const roleId = this.selectedRoleId();
    if (roleId) this.loadMatrix(roleId);
  }

  toggleRoleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.openMenuId.update(v => v === id ? '' : id);
  }

  setPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.roles().length / this.pageSize()));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  onCreateRole() {
    this.editingRole.set(null);
    this.showRoleForm.set(true);
  }

  onEditRole(role: Role) {
    this.editingRole.set(role);
    this.showRoleForm.set(true);
  }

  onConfirmDelete(role: Role) {
    if (role.isSystem) {
      this.notifSvc.warning('No se pueden eliminar roles del sistema.');
      return;
    }
    this.roleToDelete.set(role);
    this.showDeleteConfirm.set(true);
  }

  onCloseForm() { this.showRoleForm.set(false); this.editingRole.set(null); }
  
  onRoleSaved() { this.load(); }

  cancelDelete() { this.showDeleteConfirm.set(false); this.roleToDelete.set(null); }

  executeDelete() {
    const role = this.roleToDelete();
    if (!role) return;
    this.roleSvc.delete(role.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifSvc.success(res.message || `Rol "${role.name}" eliminado.`);
          this.load();
          this.cancelDelete();
        } else {
          this.notifSvc.error(res.message || 'No se pudo eliminar el rol.');
        }
      },
      error: () => this.notifSvc.error('Error al conectar con el servidor.')
    });
  }

  safeIcon(icon: string): string {
    const validIcons = ['layout-grid', 'headset', 'package', 'ticket-check', 'book-open', 'file-text', 'bar-chart-3', 'settings', 'bell', 'shield', 'users', 'lock', 'key'];
    const normalized = (icon || 'shield').replace(/_/g, '-');
    return validIcons.includes(normalized) ? normalized : 'shield';
  }
}
