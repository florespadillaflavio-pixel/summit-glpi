import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ContractService } from '../../../core/services/contract.service';
import { Router } from '@angular/router';
import { Contract, ReturnValue, ContractListItem, MesTimeline } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ContractForm } from '../contract-form/contract-form.component';

const MESES_COLORS = ['#2faa6f', '#f79009', '#175cd3', '#143f5c', '#5aafb8', '#b42318'];

@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PaginationComponent, ContractForm],
  templateUrl: './contract-list.component.html'
})
export class ContractList implements OnInit {
  private router      = inject(Router);
  private contractSvc = inject(ContractService);

  contratos     = signal<ContractListItem[]>([]);
  timelineMeses = signal<MesTimeline[]>([]);
  loading       = signal(false);
  page          = signal(1);
  pageSize      = signal(10);

  // Create/edit modal state
  showForm         = signal(false);
  selectedContract = signal<Contract | null>(null);

  readonly mesColors = MESES_COLORS;

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.contractSvc.getAll().subscribe({
      next: (res: ReturnValue<Contract[]>) => {
        if (res.success && res.data) {
          this.contratos.set(res.data.map((u: Contract) => ({
            id:       u.id,
            nombre:   u.name || '',
            tipo:     u.type || '', // graceful default when the API omits it
            proveedor:u.vendorName || '',
            inicio:   u.startDate || '',
            fin:      u.endDate || '',
            valor:    u.value || 0,
            estado:   this.mapStatus(u.statusName),
            activos:  u.assetCount ?? 0, // graceful default when the API omits it
          })));
          this.buildTimeline();
        }
        this.loading.set(false);
      },
      error: () => {
        this.contratos.set([]);
        this.loading.set(false);
      },
    });
  }

  private mapStatus(status: string): ContractListItem['estado'] {
    if (status === 'Por vencer') return 'Por vencer';
    if (status === 'Vencido')    return 'Vencido';
    return 'Activo';
  }

  private buildTimeline() {
    const now = new Date();
    const months: MesTimeline[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
      const yy = d.getFullYear();
      const mm = d.getMonth();
      const matching = this.contratos().filter(c => {
        if (!c.fin) return false;
        const fin = new Date(c.fin);
        return fin.getFullYear() === yy && fin.getMonth() === mm;
      }).map((c, idx) => ({ nombre: c.nombre, color: MESES_COLORS[idx % MESES_COLORS.length] }));
      months.push({ label, contratos: matching });
    }
    this.timelineMeses.set(months);
  }

  totalActivos = computed(() => this.contratos().filter(c => c.estado === 'Activo').length);
  porVencer    = computed(() => this.contratos().filter(c => c.estado === 'Por vencer').length);
  montoTotal   = computed(() => {
    const total = this.contratos().filter(c => c.estado !== 'Vencido').reduce((s, c) => s + c.valor, 0);
    return '$' + total.toLocaleString('en-US');
  });
  pagedContratos = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.contratos().slice(start, start + this.pageSize());
  });

  mesColor(i: number): string { return this.mesColors[i % this.mesColors.length]; }

  estadoBadge(estado: ContractListItem['estado']): string {
    if (estado === 'Activo')     return 'badge is-resolved';
    if (estado === 'Por vencer') return 'badge is-progress';
    return 'badge is-cancelled';
  }

  formatMoney(v: number): string { return '$' + v.toLocaleString('en-US'); }

  setPage(page: number) {
    const totalPages = Math.max(1, Math.ceil(this.contratos().length / this.pageSize()));
    if (page < 1 || page > totalPages) return;
    this.page.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  onIrAlDetalle(id: string | number) { this.router.navigate(['/contracts', id]); }

  onNuevoContrato() {
    this.selectedContract.set(null);
    this.showForm.set(true);
  }

  onCloseForm() {
    this.showForm.set(false);
    this.selectedContract.set(null);
  }

  onContractSaved() {
    this.onCloseForm();
    this.load();
  }
}
