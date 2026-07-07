import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogService } from '../../../../core/services/catalog.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { CatalogForm } from '../catalog-form/catalog-form.component';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { CatalogGroup, CatalogItem, LocalCatalogGroup, ReturnValue } from '../../../../core/models';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-list-catalogs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CatalogForm, ModalComponent, PaginationComponent],
  templateUrl: './list-catalogs.component.html'
})
export class ListCatalogs implements OnInit {
  private catalogSvc = inject(CatalogService);
  private notifSvc = inject(NotificationService);

  // State
  loading = signal(false);
  itemsLoading = signal(false);
  groups = signal<LocalCatalogGroup[]>([]);
  activeModule = signal<string>('');
  selectedGroupCode = signal<string>('');
  allItems = signal<CatalogItem[]>([]);
  groupPage = signal(1);
  groupPageSize = signal(8);
  itemPage = signal(1);
  itemPageSize = signal(10);
  
  // Modals state
  showCatalogForm = signal(false);
  editingItem = signal<CatalogItem | null>(null);
  showDeleteConfirm = signal(false);
  itemToDelete = signal<CatalogItem | null>(null);

  ngOnInit() {
    this.loadGroups();
  }

  loadGroups() {
    this.loading.set(true);
    this.catalogSvc.getAll().subscribe({
      next: (res: ReturnValue<CatalogGroup[]>) => {
        if (res.success && res.data) {
          const mapped: LocalCatalogGroup[] = res.data.map((g) => ({
            id: g.id,
            code: g.code,
            name: g.name,
            moduleName: g.module || 'General'
          }));
          this.groups.set(mapped);
          
          const modules = this.uniqueModules();
          if (modules.length > 0) {
            const firstModule = modules[0];
            this.activeModule.set(firstModule);
            
            // Seleccionar el primer grupo de ese módulo
            const firstGroup = mapped.find(g => g.moduleName === firstModule);
            if (firstGroup) {
              this.onSelectGroup(firstGroup.code);
            }
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  uniqueModules = computed(() => Array.from(new Set(this.groups().map(g => g.moduleName))));
  filteredGroups = computed(() => this.groups().filter(g => g.moduleName === this.activeModule()));
  pagedGroups = computed(() => {
    const start = (this.groupPage() - 1) * this.groupPageSize();
    return this.filteredGroups().slice(start, start + this.groupPageSize());
  });
  selectedGroup = computed(() => this.groups().find(g => g.code === this.selectedGroupCode()) || null);
  selectedItems = computed(() => [...this.allItems()]); // Spread to ensure new reference
  pagedItems = computed(() => {
    const start = (this.itemPage() - 1) * this.itemPageSize();
    return this.selectedItems().slice(start, start + this.itemPageSize());
  });

  onSelectModule(mod: string) {
    this.activeModule.set(mod);
    this.groupPage.set(1);
    this.itemPage.set(1);
    const groups = this.filteredGroups();
    if (groups.length > 0) {
      this.onSelectGroup(groups[0].code);
    } else {
      this.selectedGroupCode.set('');
      this.allItems.set([]);
    }
  }

  onSelectGroup(code: string) {
    this.selectedGroupCode.set(code);
    this.itemPage.set(1);
    this.loadItems(code);
  }

  loadItems(groupCode: string) {
    this.itemsLoading.set(true);
    this.catalogSvc.getGroupItems(groupCode).subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success && res.data) {
          this.allItems.set(res.data);
        }
        this.itemsLoading.set(false);
      },
      error: () => this.itemsLoading.set(false)
    });
  }

  getModuleIcon(mod: string): string {
    const map: Record<string, string> = {
      'ADMIN': 'settings',
      'HELPDESK': 'headset',
      'CMDB': 'database',
      'CONTRACTS': 'file-text',
      'REPORTS': 'bar-chart'
    };
    return map[mod] || 'folder';
  }

  // Form Handlers
  onCreateItem() {
    this.editingItem.set(null);
    this.showCatalogForm.set(true);
  }

  onEditItem(item: CatalogItem) {
    this.editingItem.set(item);
    this.showCatalogForm.set(true);
  }

  onCloseForm() {
    this.showCatalogForm.set(false);
    this.editingItem.set(null);
  }

  onItemSaved() {
    this.loadItems(this.selectedGroupCode());
  }

  setGroupPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.filteredGroups().length / this.groupPageSize()));
    if (page < 1 || page > totalPages) return;
    this.groupPage.set(page);
  }

  setGroupPageSize(size: number) {
    this.groupPageSize.set(size);
    this.groupPage.set(1);
  }

  setItemPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.selectedItems().length / this.itemPageSize()));
    if (page < 1 || page > totalPages) return;
    this.itemPage.set(page);
  }

  setItemPageSize(size: number) {
    this.itemPageSize.set(size);
    this.itemPage.set(1);
  }

  // Actions
  onDeleteItem(item: CatalogItem) {
    this.itemToDelete.set(item);
    this.showDeleteConfirm.set(true);
  }

  cancelDeleteItem() {
    this.showDeleteConfirm.set(false);
    this.itemToDelete.set(null);
  }

  executeDeleteItem() {
    const item = this.itemToDelete();
    if (!item) return;
    this.catalogSvc.deleteItem(item.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notifSvc.success(res.message || 'Ítem eliminado correctamente.');
          this.loadItems(this.selectedGroupCode());
          this.cancelDeleteItem();
        } else {
          this.notifSvc.error(res.message || 'No se pudo eliminar el ítem.');
        }
      },
      error: () => this.notifSvc.error('Error al intentar eliminar el ítem.')
    });
  }
}
