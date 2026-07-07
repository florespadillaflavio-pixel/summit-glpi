import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { KbService } from '../../../core/services/kb.service';
import { KbArticle, KbCategory, ReturnValue } from '../../../core/models';
import { ModalComponent } from '../../../shared/components/modal/modal';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-kb-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, ModalComponent],
  templateUrl: './kb-view.component.html'
})
export class KbView implements OnInit {
  private kbSvc  = inject(KbService);

  articulos  = signal<KbArticle[]>([]);
  categorias = signal<KbCategory[]>([]);
  loading    = signal(false);
  detailLoading = signal(false);
  selectedArticle = signal<KbArticle | null>(null);

  searchCtrl = new FormControl('');
  searchQuery = signal('');
  activeCat  = signal<string | null>(null);
  page       = signal(1);
  viewMode   = signal<'cards' | 'table'>('cards');

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.kbSvc.getArticles().subscribe({
      next: (res: ReturnValue<KbArticle[]>) => {
        if (res.success && res.data) {
          this.articulos.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.kbSvc.getCategories().subscribe({
      next: (res: ReturnValue<KbCategory[]>) => {
        if (res.success && res.data) {
          this.categorias.set(res.data);
        }
      },
    });
  }

  onSetCat(cat: string | null) { this.activeCat.set(cat); this.page.set(1); }
  onApplySearch() {
    this.searchQuery.set(this.searchCtrl.value ?? '');
    this.page.set(1);
  }
  onSearchInput() {
    this.searchQuery.set(this.searchCtrl.value ?? '');
    this.page.set(1);
  }

  articulosFiltrados = computed(() => {
    const q   = this.searchQuery().toLowerCase();
    const catId = this.activeCat();
    return this.articulos().filter(a => {
      if (catId && a.categoryName !== catId) return false; // Note: simplified match by name if categoryId isn't stored as ID in local state
      if (q && !a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });

  destacados = computed(() => this.articulos().slice().sort((a, b) => b.views - a.views).slice(0, 3));
  totalViews = computed(() => this.articulos().reduce((sum, article) => sum + (article.views || 0), 0));
  popularArticle = computed<KbArticle | null>(() => this.destacados()[0] ?? null);
  categoryCount = computed(() => this.categorias().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.articulosFiltrados().length / PAGE_SIZE)));
  pages      = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pageStart  = computed(() => this.articulosFiltrados().length ? (this.page() - 1) * PAGE_SIZE + 1 : 0);
  pageEnd    = computed(() => Math.min(this.page() * PAGE_SIZE, this.articulosFiltrados().length));

  articulosPagina = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.articulosFiltrados().slice(start, start + PAGE_SIZE);
  });

  onSetPage(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }
  onIrAlArticulo(id: string) {
    const cached = this.articulos().find(article => article.id === id) ?? null;
    this.selectedArticle.set(cached);
    this.detailLoading.set(true);

    this.kbSvc.getArticleById(id).subscribe({
      next: (res: ReturnValue<KbArticle>) => {
        if (res.success && res.data) {
          this.selectedArticle.set(res.data);
        }
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  onCloseArticle() {
    this.selectedArticle.set(null);
    this.detailLoading.set(false);
  }

  articleInitial(article: KbArticle): string {
    return (article.categoryName || article.title || 'K').slice(0, 1).toUpperCase();
  }
}
