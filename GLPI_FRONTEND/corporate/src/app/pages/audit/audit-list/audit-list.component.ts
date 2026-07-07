import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuditService } from '../../../core/services/audit.service';
import { AuditDetail } from '../audit-detail/audit-detail.component';
import { AuditEntry, PagedResult, ReturnValue } from '../../../core/models';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AuditDetail, DatePickerComponent, PaginationComponent],
  templateUrl: './audit-list.component.html'
})
export class AuditList implements OnInit {
  private auditSvc = inject(AuditService);
  private readonly knownAuditEntities = [
    'asset',
    'catalog_group',
    'catalog_item',
    'company',
    'contract',
    'kb_article',
    'role',
    'role_permission',
    'tenant_config',
    'ticket',
    'user_account',
  ];

  searchQuery = signal('');
  filterAction = signal('');
  filterEntity = signal('');
  dateFrom = signal(this.isoDate(-7));
  dateTo = signal(this.isoDate(0));
  loading = signal(false);
  errorMsg = signal('');
  
  allEntries = signal<AuditEntry[]>([]);
  page = signal(1);
  pageSize = signal(20);
  totalItems = signal(0);
  totalPages = signal(1);
  
  showDetail = signal(false);
  selectedEntry = signal<AuditEntry | null>(null);

  filteredEntries = computed(() => {
    return this.allEntries();
  });

  totalCount = computed(() => this.totalItems());
  createCount = computed(() => this.allEntries().filter(e => this.isCreateAction(e.action)).length);
  updateCount = computed(() => this.allEntries().filter(e => e.action === 'UPDATE').length);
  deleteCount = computed(() => this.allEntries().filter(e => e.action === 'DELETE').length);
  pageStart = computed(() => this.totalItems() === 0 ? 0 : ((this.page() - 1) * this.pageSize()) + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));

  availableEntities = computed(() => {
    return [...new Set([...this.knownAuditEntities, ...this.allEntries().map(e => this.entityBase(e.entity)).filter(Boolean)])]
      .sort((a, b) => a.localeCompare(b));
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.errorMsg.set('');
    const filters = {
      action: this.filterAction() || undefined,
      entity: this.filterEntity() || undefined,
      q: this.searchQuery().trim() || undefined,
      from: this.dateFrom() || undefined,
      to: this.toInclusiveDate(this.dateTo()) || undefined,
      page: this.page(),
      pageSize: this.pageSize(),
    };
    
    this.auditSvc.getAll(filters).subscribe({
      next: (res: ReturnValue<PagedResult<AuditEntry>>) => {
        if (res.success && res.data) {
          this.allEntries.set((res.data.items ?? []).map(e => this.normalizeEntry(e)));
          this.totalItems.set(res.data.totalCount ?? 0);
          this.totalPages.set(Math.max(1, res.data.totalPages ?? 1));
          this.page.set(res.data.page ?? this.page());
          this.pageSize.set(res.data.pageSize ?? this.pageSize());
        } else {
          this.allEntries.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
          this.errorMsg.set(res.message || '');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.allEntries.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.errorMsg.set(err?.error?.message || 'No se pudo consultar la auditoría.');
        this.loading.set(false);
      }
    });
  }

  onFilter() {
    this.page.set(1);
    this.load();
  }

  clearFilters() {
    this.searchQuery.set('');
    this.filterAction.set('');
    this.filterEntity.set('');
    this.dateFrom.set(this.isoDate(-7));
    this.dateTo.set(this.isoDate(0));
    this.page.set(1);
    this.load();
  }

  updateSearchQuery(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  updatePageSize(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.onPageSizeChange(Number(target.value) || 20);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.page() || this.loading()) return;
    this.page.set(page);
    this.load();
  }

  updateFilterAction(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterAction.set(target.value);
  }

  updateFilterEntity(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterEntity.set(target.value);
  }

  updateDateFrom(event: Event) {
    const target = event.target as HTMLInputElement;
    this.dateFrom.set(target.value);
  }

  updateDateTo(event: Event) {
    const target = event.target as HTMLInputElement;
    this.dateTo.set(target.value);
  }

  onViewDetail(entry: AuditEntry) {
    this.selectedEntry.set(entry);
    this.showDetail.set(true);
  }

  onCloseDetail() {
    this.showDetail.set(false);
    this.selectedEntry.set(null);
  }

  actionBadgeClass(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'is-success',
      INSERT: 'is-success',
      UPDATE: 'is-info',
      DELETE: 'is-danger',
      LOGIN: 'is-navy',
    };
    return map[action] ?? 'is-neutral';
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'plus',
      INSERT: 'plus',
      UPDATE: 'pencil',
      DELETE: 'trash-2',
      LOGIN: 'log-in',
    };
    return map[action] ?? 'shield';
  }

  actionLabel(action: string): string {
    return action === 'INSERT' ? 'INSERT' : action;
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  shortId(value: string): string {
    if (!value) return '-';
    return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
  }

  displayEntity(value: string): string {
    return this.entityBase(value);
  }

  private normalizeEntry(raw: AuditEntry | any): AuditEntry {
    const oldValues = raw.oldValues ?? raw.old_values ?? {};
    const newValues = raw.newValues ?? raw.new_values ?? {};
    const action = String(raw.action ?? 'UPDATE').toUpperCase();
    const entity = raw.entity ?? raw.entityName ?? raw.entity_name ?? raw.entityType ?? 'Sistema';
    const entityId = raw.entityId ?? raw.entity_id ?? '';
    const user = raw.user ?? raw.userName ?? raw.username ?? raw.userId ?? raw.user_id ?? 'Sistema';
    const timestamp = raw.timestamp ?? raw.createdAt ?? raw.created_at ?? '';
    const ip = raw.ip ?? raw.ipAddress ?? raw.ip_address ?? '';
    const summary = raw.summary || this.buildSummary(action, entity, entityId);

    return {
      ...raw,
      id: raw.id ?? `${timestamp}-${entity}-${entityId}`,
      timestamp,
      user,
      userName: raw.userName ?? raw.username,
      action,
      entity,
      entityType: entity,
      entityId,
      summary,
      details: raw.details ?? summary,
      ip,
      oldValues,
      newValues,
    };
  }

  private buildSummary(action: string, entity: string, entityId: string): string {
    const cleanEntity = this.entityBase(entity);
    const verbs: Record<string, string> = {
      CREATE: 'Creación de registro',
      INSERT: 'Creación de registro',
      UPDATE: 'Actualización de registro',
      DELETE: 'Eliminación de registro',
      LOGIN: 'Inicio de sesión',
    };
    return `${verbs[action] ?? 'Cambio registrado'} en ${cleanEntity}${entityId ? ` (${this.shortId(entityId)})` : ''}`;
  }

  private entityBase(value: string): string {
    return String(value || 'Sistema').split(':')[0];
  }

  private isCreateAction(action: string): boolean {
    return action === 'CREATE' || action === 'INSERT';
  }

  private isoDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  private toInclusiveDate(value: string): string {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }
}
