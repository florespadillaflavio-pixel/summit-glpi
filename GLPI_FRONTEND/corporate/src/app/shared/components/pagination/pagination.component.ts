import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sm-pagination-bar">
      <div class="sm-page-size">
        <span>Filas por página</span>
        <select class="sm-input" [value]="pageSize()" (change)="onPageSizeChange($event)" [disabled]="disabled()">
          @for (size of pageSizeOptions(); track size) {
            <option [value]="size">{{ size }}</option>
          }
        </select>
      </div>

      <span class="sm-page-summary">
        {{ rangeStart() }}-{{ rangeEnd() }} de {{ totalItems() }} · Página {{ page() }} de {{ totalPages() }}
      </span>

      <nav class="sm-pagination" aria-label="Paginación">
        <button class="sm-page-btn sm-page-text-btn" [disabled]="page() === 1 || disabled()" (click)="setPage.emit(1)" title="Primera página">
          Primera
        </button>
        <button class="sm-page-btn sm-page-text-btn" [disabled]="page() === 1 || disabled()" (click)="setPage.emit(page() - 1)" title="Página anterior">
          Anterior
        </button>
        @for (p of visiblePages(); track p) {
          <button class="sm-page-btn" [class.active]="p === page()" [disabled]="disabled()" (click)="setPage.emit(p)">{{ p }}</button>
        }
        <button class="sm-page-btn sm-page-text-btn" [disabled]="page() === totalPages() || disabled()" (click)="setPage.emit(page() + 1)" title="Página siguiente">
          Siguiente
        </button>
        <button class="sm-page-btn sm-page-text-btn" [disabled]="page() === totalPages() || disabled()" (click)="setPage.emit(totalPages())" title="Última página">
          Última
        </button>
      </nav>
    </div>
  `,
})
export class PaginationComponent {
  totalItems = input.required<number>();
  page = input.required<number>();
  pageSize = input.required<number>();
  disabled = input(false);
  pageSizeOptions = input<number[]>([10, 20, 50, 100]);

  setPage = output<number>();
  setPageSize = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : ((this.page() - 1) * this.pageSize()) + 1);
  rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  });

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value) || this.pageSize();
    this.setPageSize.emit(value);
  }
}
