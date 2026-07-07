import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { KbService } from '../../../core/services/kb.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { KbArticle, KbCategory, ReturnValue } from '../../../core/models';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field';
import { MAXLEN, getControlError } from '../../../core/validators/app-validators';

/** Content is a long-form field with its own dedicated limit. */
const CONTENT_MAX = 20000;

@Component({
  selector: 'app-kb-article-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './kb-article-form.component.html'
})
export class KbArticleForm implements OnInit {
  private fb = inject(FormBuilder);
  private kbSvc = inject(KbService);
  private notifSvc = inject(NotificationService);

  // Inputs & Outputs
  article = input<KbArticle | null>(null);
  close = output<void>();
  saved = output<void>();

  // State
  loading = signal(false);
  saving = signal(false);
  categorias = signal<KbCategory[]>([]);

  articleForm: FormGroup = this.fb.group({
    title:      ['', [Validators.required, Validators.maxLength(MAXLEN.TITLE)]],
    summary:    ['', [Validators.maxLength(MAXLEN.GENERIC)]],
    content:    ['', [Validators.required, Validators.maxLength(CONTENT_MAX)]],
    categoryId: ['', [Validators.required]],
    tags:       ['']
  });

  ngOnInit() {
    this.loading.set(true);
    this.kbSvc.getCategories().subscribe({
      next: (res: ReturnValue<KbCategory[]>) => {
        if (res.success && res.data) this.categorias.set(res.data);
        this.prefill();
        this.loading.set(false);
      },
      error: () => {
        this.prefill();
        this.loading.set(false);
      }
    });
  }

  private prefill() {
    const a = this.article();
    if (!a) return;
    const byName = this.categorias().find(c => c.name === a.categoryName);
    this.articleForm.patchValue({
      title: a.title,
      summary: a.summary || '',
      content: a.content,
      categoryId: a.categoryId || byName?.id || '',
      tags: (a.tags || []).join(', ')
    });
  }

  onClose() {
    this.close.emit();
  }

  getFieldError(name: string, label: string): string {
    return getControlError(this.articleForm.get(name), label);
  }

  private parseTags(raw: string): string[] {
    return (raw || '')
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  saveArticle() {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.articleForm.value;
    const payload: Partial<KbArticle> = {
      title: (val.title || '').trim(),
      summary: (val.summary || '').trim(),
      content: val.content,
      categoryId: val.categoryId,
      tags: this.parseTags(val.tags)
    };

    const current = this.article();
    const request = current
      ? this.kbSvc.updateArticle(current.id, payload)
      : this.kbSvc.createArticle(payload);

    request.subscribe({
      next: (res: ReturnValue) => {
        if (res.success) {
          this.notifSvc.success(res.message || (current ? 'Artículo actualizado' : 'Artículo creado'));
          this.saved.emit();
          this.onClose();
        } else {
          this.notifSvc.error(res.message);
        }
        this.saving.set(false);
      },
      error: () => {
        this.notifSvc.error(current ? 'Error al actualizar el artículo' : 'Error al crear el artículo');
        this.saving.set(false);
      }
    });
  }
}
