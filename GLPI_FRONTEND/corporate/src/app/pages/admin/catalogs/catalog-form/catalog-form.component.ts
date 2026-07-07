import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogService } from '../../../../core/services/catalog.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../../shared/components/input-field/input-field';
import { CatalogItem, ReturnValue } from '../../../../core/models';
import { MAXLEN, getControlError } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-catalog-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './catalog-form.component.html'
})
export class CatalogForm implements OnInit {
  private fb = inject(FormBuilder);
  private catalogSvc = inject(CatalogService);
  private notifSvc = inject(NotificationService);

  // Inputs & Outputs
  item = input<CatalogItem | null>(null);
  groupCode = input.required<string>();
  close = output<void>();
  saved = output<void>();

  // State
  saving = signal(false);
  selectedIcon = signal('circle');

  // Lista de iconos sugeridos
  availableIcons = [
    'circle', 'tag', 'package', 'user', 'users', 'building', 'database', 
    'file-text', 'headset', 'settings', 'shield', 'bell', 'clock', 
    'calendar', 'alert-triangle', 'check-circle', 'star', 'folder',
    'laptop', 'smartphone', 'monitor', 'hard-drive', 'server', 'zap',
    'image', 'map-pin', 'phone', 'mail', 'link', 'heart'
  ];

  itemForm: FormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(MAXLEN.NAME)]],
    code:        ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    description: [''],
    color:       ['#888888'],
    icon:        ['circle'],
    sortOrder:   [0, [Validators.required, Validators.min(0)]],
    isDefault:   [false],
    isActive:    [true]
  });

  getFieldError(controlName: string, label: string): string {
    const control = this.itemForm.get(controlName);
    if (control?.hasError('min') && (control.touched || control.dirty)) {
      return `${label} no puede ser negativo`;
    }
    return getControlError(control, label);
  }

  selectIcon(icon: string) {
    this.selectedIcon.set(icon);
    this.itemForm.patchValue({ icon });
  }

  ngOnInit() {
    let n = this.item();
    if (n) {
      const iconValue = n.icon || 'circle';
      this.selectedIcon.set(iconValue);
      this.itemForm.patchValue({
        name:        n.name,
        code:        n.code,
        description: n.description || '',
        color:       n.color || '#888888',
        icon:        iconValue,
        sortOrder:   n.sortOrder || 0,
        isDefault:   n.isDefault || false,
        isActive:    n.isActive ?? true
      });
    }
  }

  onClose() {
    this.close.emit();
  }

  saveItem() {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    let n = this.itemForm.value as Partial<CatalogItem>;
    let e = this.item();
    let a = this.groupCode();

    if (e) {
      // Unir los datos existentes con los cambios del formulario para no perder el groupId
      const payload = { ...e, ...n };
      this.catalogSvc.updateItem(e.id, payload as CatalogItem).subscribe({
        next: (res) => {
          if (res.success) {
            this.notifSvc.success(res.message || 'Ítem de catálogo actualizado.');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message || 'No se pudo actualizar el ítem.');
          }
          this.saving.set(false);
        },
        error: () => {
          this.notifSvc.error('Error al actualizar ítem.');
          this.saving.set(false);
        }
      });
    } else {
      this.catalogSvc.createItem(a, n).subscribe({
        next: (res) => {
          if (res.success) {
            this.notifSvc.success(res.message || 'Nuevo ítem agregado al catálogo.');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message || 'No se pudo crear el ítem.');
          }
          this.saving.set(false);
        },
        error: () => {
          this.notifSvc.error('Error al crear ítem.');
          this.saving.set(false);
        }
      });
    }
  }
}
