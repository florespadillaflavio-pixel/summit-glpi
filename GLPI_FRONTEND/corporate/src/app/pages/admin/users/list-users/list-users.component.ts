import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../../../core/services/user.service';
import { RoleService } from '../../../../core/services/role.service';
import { CompanyService } from '../../../../core/services/company.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { UserForm } from '../user-form/user-form.component';
import { UserSummary, UserDetails, Role, Company, ReturnValue } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-list-users',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, UserForm, ModalComponent, PaginationComponent],
  templateUrl: './list-users.component.html'
})

export class ListUsers implements OnInit {
  private userSvc = inject(UserService);
  private roleSvc = inject(RoleService);
  private companySvc = inject(CompanyService);
  private notifSvc = inject(NotificationService);

  // State
  loading = signal(false);
  loadingMetadata = signal(false);
  users = signal<UserSummary[]>([]);
  availableRoles = signal<Role[]>([]);
  availableCompanies = signal<Company[]>([]);
  
  // Modals state
  showUserForm = signal(false);
  selectedUser = signal<UserSummary | null>(null);
  showDeleteConfirm = signal(false);
  userToDelete = signal<UserSummary | null>(null);
  openMenuId = signal<string>('');

  // Filters
  searchQuery = signal('');
  filterRole = signal('');
  filterCompany = signal('');
  filterStatus = signal('');
  page = signal(1);
  pageSize = signal(12);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set('');
  }

  ngOnInit() {
    this.load();
    this.loadMetadata();
  }

  load() {
    this.loading.set(true);
    this.userSvc.getAll().subscribe({
      next: (res: ReturnValue<UserSummary[]>) => {
        if (res.success && res.data) {
          this.users.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadMetadata() {
    this.loadingMetadata.set(true);
    this.roleSvc.getAll().subscribe({
      next: (res: ReturnValue<Role[]>) => {
        if (res.success && res.data) this.availableRoles.set(res.data);
      }
    });

    this.companySvc.getAll().subscribe({
      next: (res: ReturnValue<Company[]>) => {
        if (res.success && res.data) this.availableCompanies.set(res.data);
        this.loadingMetadata.set(false);
      },
      error: () => this.loadingMetadata.set(false)
    });
  }

  filteredUsers = computed(() => {
    let list = this.users();
    const query = this.searchQuery().toLowerCase();
    const role = this.filterRole();
    const companyId = this.filterCompany();
    const status = this.filterStatus();

    if (query) {
      list = list.filter(u => 
        u.fullName.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query) ||
        u.company.toLowerCase().includes(query)
      );
    }

    if (role) {
      list = list.filter(u => u.role === role);
    }

    if (companyId) {
      list = list.filter(u => u.companyId === companyId);
    }

    if (status) {
      const active = status === 'active';
      list = list.filter(u => u.isActive === active);
    }

    return list;
  });

  pagedUsers = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  getInitials(user: UserSummary): string {
    const name = user.fullName || '';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || '?').toUpperCase();
  }

  getRoleBadgeClass(role: string): string {
    if (role === 'Administrador') return 'is-navy';
    if (role === 'Técnico') return 'is-teal';
    return 'is-info';
  }

  formatLastLogin(date: string | Date | null): string {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  onFilterRole(event: Event) {
    this.filterRole.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  onFilterCompany(event: Event) {
    this.filterCompany.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  onFilterStatus(event: Event) {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  setPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize()));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.openMenuId.update(v => v === id ? '' : id);
  }

  toggleStatus(user: UserSummary) {
    const nextStatus = !user.isActive;
    this.userSvc.toggleStatus(user.id, nextStatus).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifSvc.success(res.message || `Estado de "${user.fullName}" actualizado.`);
          this.load();
        } else {
          this.notifSvc.error(res.message || 'No se pudo actualizar el estado.');
        }
      },
      error: () => this.notifSvc.error('Error al conectar con el servidor.')
    });
  }

  onCreateUser() {
    this.selectedUser.set(null);
    this.showUserForm.set(true);
    this.loadMetadata();
  }

  onEditUser(user: UserSummary) {
    this.selectedUser.set(user);
    this.showUserForm.set(true);
    this.loadMetadata();
  }

  onCloseForm() {
    this.showUserForm.set(false);
    this.selectedUser.set(null);
  }

  onUserSaved() {
    this.load();
  }

  onConfirmDelete(user: UserSummary) {
    this.userToDelete.set(user);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.userToDelete.set(null);
  }

  executeDelete() {
    const user = this.userToDelete();
    if (!user) return;
    this.userSvc.delete(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifSvc.success(res.message || `Usuario "${user.fullName}" eliminado.`);
          this.load();
          this.cancelDelete();
        } else {
          this.notifSvc.error(res.message || 'No se pudo eliminar el usuario.');
        }
      },
      error: () => this.notifSvc.error('Error al conectar con el servidor.')
    });
  }
}
