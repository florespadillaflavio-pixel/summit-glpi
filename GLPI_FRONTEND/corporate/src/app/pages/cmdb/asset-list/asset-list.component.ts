import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AssetService } from '../../../core/services/asset.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CompanyService } from '../../../core/services/company.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { TokenService } from '../../../core/services/token.service';
import { AssetForm } from '../asset-form/asset-form.component';
import { Asset, AssetSummary, CatalogItem, Company, ReturnValue } from '../../../core/models';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-asset-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AssetForm, ModalComponent, PaginationComponent],
  templateUrl: './asset-list.component.html'
})
export class AssetList implements OnInit {
  private assetSvc = inject(AssetService);
  private catSvc   = inject(CatalogService);
  private companySvc = inject(CompanyService);
  private tokenSvc = inject(TokenService);
  private notifSvc = inject(NotificationService);

  loading = signal(false);
  loadingMetadata = signal(false);
  assets  = signal<AssetSummary[]>([]);
  assetTypes = signal<CatalogItem[]>([]);
  assetStatuses = signal<CatalogItem[]>([]);
  companies = signal<Company[]>([]);
  isInternal = signal(false);

  searchQuery = signal('');
  filterType  = signal('');
  filterStatus = signal('');
  page = signal(1);
  pageSize = signal(12);
  openMenuId = signal<string>('');
  
  showAssetForm = signal(false);
  selectedAsset = signal<AssetSummary | null>(null);
  selectedDetail = signal<Asset | null>(null);
  detailLoading = signal(false);
  showDeleteConfirm = signal(false);
  assetToDelete = signal<AssetSummary | null>(null);

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId.set('');
  }

  ngOnInit() {
    const user = this.tokenSvc.getUser();
    this.isInternal.set(!!user?.isInternal);
    this.load();
    this.loadCompanies();
  }

  private load() {
    this.loading.set(true);
    this.assetSvc.getAll().subscribe({
      next: (res: ReturnValue<AssetSummary[]>) => {
        if (res.success && res.data) {
          this.assets.set(res.data.map((a: AssetSummary) => ({
            ...a,
            createdAt: new Date(a.createdAt)
          })));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadMetadata() {
    this.loadingMetadata.set(true);
    let loaded = 0;
    const check = () => { if (++loaded === 2) this.loadingMetadata.set(false); };

    this.catSvc.getGroupItems('ASSET_TYPE').subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success) this.assetTypes.set(res.data || []);
        check();
      },
      error: () => check()
    });
    this.catSvc.getGroupItems('ASSET_STATUS').subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success) this.assetStatuses.set(res.data || []);
        check();
      },
      error: () => check()
    });
  }

  private loadCompanies() {
    if (!this.isInternal()) {
      const user = this.tokenSvc.getUser();
      if (user?.companyId) {
        this.companies.set([{
          id: user.companyId,
          name: user.companyName || 'Mi empresa',
          ruc: '',
          address: '',
          phone: '',
          email: '',
          website: '',
          logoUrl: '',
          isOwner: false,
          isActive: true
        }]);
      }
      return;
    }

    this.companySvc.getAll().subscribe({
      next: (res: ReturnValue<Company[]>) => {
        if (res.success && res.data) {
          this.companies.set(res.data.filter(company => company.isActive));
        }
      }
    });
  }

  filteredAssets = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const type = this.filterType();
    const status = this.filterStatus();
    return this.assets().filter(a => {
      const matchQ = !q || a.assetTag.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || a.typeName.toLowerCase().includes(q);
      const matchType = !type || a.typeCode === type;
      const matchStatus = !status || a.statusCode === status;
      return matchQ && matchType && matchStatus;
    });
  });

  totalAssets = computed(() => this.assets().length);
  assignedAssets = computed(() => this.assets().filter(a => !!a.assignedToName && a.assignedToName !== 'Sin asignar').length);
  withPhotoAssets = computed(() => this.assets().filter(a => !!a.photoUrl).length);
  availableAssets = computed(() => this.assets().filter(a => ['AVAILABLE', 'DISPONIBLE'].includes((a.statusCode || '').toUpperCase()) || (a.statusName || '').toLowerCase().includes('disponible')).length);

  pagedAssets = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredAssets().slice(start, start + this.pageSize());
  });

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  onFilterType(event: Event) {
    this.filterType.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  onFilterStatus(event: Event) {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  setPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.filteredAssets().length / this.pageSize()));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  toggleAssetMenu(id: string, event: Event) {
    event.stopPropagation();
    this.openMenuId.update(v => v === id ? '' : id);
  }

  getAssetIcon(typeCode: string): string {
    const map: Record<string, string> = {
      'LAPTOP': 'laptop', 'DESKTOP': 'monitor', 'SERVER': 'server',
      'PHONE': 'smartphone', 'PRINTER': 'printer', 'NETWORK': 'network'
    };
    return map[typeCode] || 'package';
  }

  // Form Handlers
  onCreateAsset() { this.selectedAsset.set(null); this.showAssetForm.set(true); this.loadMetadata(); }
  onEditAsset(asset: AssetSummary) { this.selectedAsset.set(asset); this.showAssetForm.set(true); this.loadMetadata(); }
  onCloseForm() { this.showAssetForm.set(false); this.selectedAsset.set(null); }
  onAssetSaved() { this.load(); }

  // Actions
  onViewDetail(id: string) {
    this.detailLoading.set(true);
    this.assetSvc.getById(id).subscribe({
      next: (res: ReturnValue<Asset>) => {
        if (res.success && res.data) {
          this.selectedDetail.set(res.data);
        }
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false)
    });
  }
  onCloseDetail() {
    this.selectedDetail.set(null);
    this.detailLoading.set(false);
  }
  onViewHistory(asset: AssetSummary) { this.notifSvc.info('Historial no implementado aún.'); }
  onImport() { this.notifSvc.info('Función de importación próximamente.'); }

  onConfirmDelete(asset: AssetSummary) { this.assetToDelete.set(asset); this.showDeleteConfirm.set(true); }
  cancelDelete() { this.showDeleteConfirm.set(false); this.assetToDelete.set(null); }
  executeDelete() {
    const asset = this.assetToDelete();
    if (!asset) return;
    this.assetSvc.delete(asset.id).subscribe({
      next: () => {
        this.notifSvc.success(`Activo "${asset.assetTag}" eliminado.`);
        this.load();
        this.cancelDelete();
      }
    });
  }
}
