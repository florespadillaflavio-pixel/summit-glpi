import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CompanyService } from '../../../../core/services/company.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { CompanyForm } from '../company-form/company-form.component';
import { Tenant, ReturnValue, Company } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-list-companies',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CompanyForm, ModalComponent, PaginationComponent],
  templateUrl: './list-companies.component.html'
})

export class ListCompanies implements OnInit {
  private companySvc = inject(CompanyService);
  private notifSvc = inject(NotificationService);

  // State
  loading = signal(false);
  tenants = signal<Tenant[]>([]);
  page = signal(1);
  pageSize = signal(12);
  openMenuId = signal<string>('');
  
  // Modals state
  showCompanyForm = signal(false);
  selectedTenant = signal<Tenant | null>(null);
  showDeleteConfirm = signal(false);
  tenantToDelete = signal<Tenant | null>(null);
  showSuspendConfirm = signal(false);
  tenantToSuspend = signal<Tenant | null>(null);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set('');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.companySvc.getAll().subscribe({
      next: (res: ReturnValue<Company[]>) => {
        if (res.success && res.data) {
          this.tenants.set(res.data.map((c: Company) => {
            return {
              ...c,
              domain: c.website || 'No definido',
              status: c.isActive === false ? 'Suspendido' : 'Activo',
              userCount: c.userCount || 0,
              ticketCount: c.ticketCount || 0,
              assetCount: c.assetCount || 0,
              since: c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }) : 'N/A'
            } as Tenant;
          }));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  totalUsers = computed(() => this.tenants().reduce((acc, t) => acc + t.userCount, 0));
  totalAssets = computed(() => this.tenants().reduce((acc, t) => acc + t.assetCount, 0));
  pagedTenants = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.tenants().slice(start, start + this.pageSize());
  });

  setPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.tenants().length / this.pageSize()));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusBadge(status: string) {
    if (status === 'Activo') return 'is-success';
    if (status === 'Suspendido') return 'is-danger';
    return 'is-warning';
  }

  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.openMenuId.update(v => v === id ? '' : id);
  }

  onCreateTenant() {
    this.selectedTenant.set(null);
    this.showCompanyForm.set(true);
  }

  onEditTenant(tenant: Tenant) {
    this.selectedTenant.set(tenant);
    this.showCompanyForm.set(true);
  }

  onCloseForm() {
    this.showCompanyForm.set(false);
    this.selectedTenant.set(null);
  }

  onTenantSaved() {
    this.load();
  }

  onSuspendTenant(tenant: Tenant) {
    this.tenantToSuspend.set(tenant);
    this.showSuspendConfirm.set(true);
  }

  cancelSuspend() {
    this.showSuspendConfirm.set(false);
    this.tenantToSuspend.set(null);
  }

  executeSuspend() {
    const tenant = this.tenantToSuspend();
    if (!tenant) return;
    const action = tenant.status === 'Suspendido' ? 'activar' : 'suspender';
    this.companySvc.suspend(tenant.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifSvc.success(res.message || `Tenant ${tenant.name} ${action}ado.`);
          this.load();
          this.cancelSuspend();
        } else {
          this.notifSvc.error(res.message);
        }
      },
      error: () => this.notifSvc.error(`Error al intentar ${action} el tenant.`)
    });
  }

  onConfirmDelete(tenant: Tenant) {
    this.tenantToDelete.set(tenant);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.tenantToDelete.set(null);
  }

  executeDelete() {
    const t = this.tenantToDelete();
    if (!t) return;
    this.companySvc.delete(t.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifSvc.success(res.message || `Organización "${t.name}" eliminada.`);
          this.load();
          this.cancelDelete();
        } else {
          this.notifSvc.error(res.message);
        }
      },
      error: () => this.notifSvc.error('Error al conectar con el servidor.')
    });
  }
}
