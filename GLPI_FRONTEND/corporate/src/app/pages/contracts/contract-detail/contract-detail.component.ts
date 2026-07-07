import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ContractService } from '../../../core/services/contract.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { Contract, CatalogItem, ReturnValue } from '../../../core/models';
import { ContractForm } from '../contract-form/contract-form.component';

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ContractForm],
  templateUrl: './contract-detail.component.html'
})
export class ContractDetail implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private contractSvc = inject(ContractService);
  private catalogSvc  = inject(CatalogService);

  contractId = this.route.snapshot.paramMap.get('id') ?? '';

  loading  = signal(true);
  notFound = signal(false);
  contract = signal<Contract | null>(null);
  showForm = signal(false);

  private statuses = signal<CatalogItem[]>([]);
  private types    = signal<CatalogItem[]>([]);

  statusLabel = computed(() => this.resolveName(this.statuses(), this.contract()?.statusItemId));
  typeLabel   = computed(() => this.resolveName(this.types(), this.contract()?.typeItemId));

  ngOnInit() {
    if (!this.contractId) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadCatalogs();
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.contractSvc.getById(this.contractId).subscribe({
      next: (res: ReturnValue<Contract>) => {
        if (res.success && res.data) {
          this.contract.set(res.data);
        } else {
          this.notFound.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadCatalogs() {
    this.catalogSvc.getGroupItems('CONTRACT_STATUS').subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success && res.data) this.statuses.set(res.data);
      },
      error: () => this.statuses.set([])
    });
    this.catalogSvc.getGroupItems('CONTRACT_TYPE').subscribe({
      next: (res: ReturnValue<CatalogItem[]>) => {
        if (res.success && res.data) this.types.set(res.data);
      },
      error: () => this.types.set([])
    });
  }

  private resolveName(items: CatalogItem[], id?: string): string {
    if (!id) return 'Sin definir';
    return items.find(i => i.id === id)?.name || 'Sin definir';
  }

  formatMoney(v: number | undefined): string {
    return '$' + (v ?? 0).toLocaleString('en-US');
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('es-PE');
  }

  onEdit() { this.showForm.set(true); }

  onCloseForm() { this.showForm.set(false); }

  onSaved() {
    this.showForm.set(false);
    this.load();
  }

  onGoBack() { this.router.navigate(['/contracts']); }
}
