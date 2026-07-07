import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AssetService } from '../../../core/services/asset.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { Asset, AssetSummary, CatalogItem, Company, ReturnValue } from '../../../core/models';
import { InputFieldComponent } from '../../../shared/components/input-field/input-field';
import { MAXLEN, getControlError } from '../../../core/validators/app-validators';

/** Allowed characters for asset tag / serial number: letters, digits, spaces, dash and underscore. */
const ASSET_CODE_PATTERN = /^[A-Za-z0-9 _-]+$/;
const ASSET_CODE_MAXLEN = 80;

const ASSET_IMAGE_MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const ALLOWED_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './asset-form.component.html'
})
export class AssetForm implements OnInit {
  private fb       = inject(FormBuilder);
  private assetSvc = inject(AssetService);
  private notifSvc = inject(NotificationService);

  // Inputs & Outputs
  asset = input<AssetSummary | null>(null);
  assetTypes = input<CatalogItem[]>([]);
  assetStatuses = input<CatalogItem[]>([]);
  companies = input<Company[]>([]);
  isInternal = input<boolean>(false);
  loading = input<boolean>(false);
  close = output<void>();
  saved = output<void>();

  // State
  saving = signal(false);
  selectedFile: File | null = null;
  imageError = signal<string | null>(null);
  previewUrl = signal<string | null>(null);

  assetForm: FormGroup = this.fb.group({
    companyId:       ['', Validators.required],
    assetTag:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(ASSET_CODE_MAXLEN), Validators.pattern(ASSET_CODE_PATTERN)]],
    serialNumber:    ['', [Validators.required, Validators.maxLength(ASSET_CODE_MAXLEN), Validators.pattern(ASSET_CODE_PATTERN)]],
    assetTypeItemId: ['', Validators.required],
    statusItemId:    ['', Validators.required],
    photoUrl:        [''],
    notes:           ['', Validators.maxLength(MAXLEN.TEXT)]
  });

  ngOnInit() {
    let s = this.asset();
    if (s) {
      this.assetSvc.getById(s.id).subscribe((res: ReturnValue<Asset>) => {
        if (res.success && res.data) {
          let n = res.data;
          this.assetForm.patchValue({
            companyId:       n.companyId,
            assetTag:        n.assetTag,
            serialNumber:    n.serialNumber,
            assetTypeItemId: n.assetTypeItemId,
            statusItemId:    n.statusItemId,
            photoUrl:        n.photoUrl || '',
            notes:           n.notes
          });
          this.previewUrl.set(n.photoUrl || null);
        }
      });
    } else if (!this.isInternal() && this.companies().length === 1) {
      this.assetForm.patchValue({ companyId: this.companies()[0].id });
    }
  }

  onClose() {
    this.close.emit();
  }

  isFieldInvalid(s: string) {
    let e = this.assetForm.get(s);
    return e ? e.invalid && e.touched : false;
  }

  getFieldError(controlName: string, label: string): string {
    return getControlError(this.assetForm.get(controlName), label);
  }

  photoPreview() {
    return this.previewUrl() || String(this.assetForm.get('photoUrl')?.value || '').trim();
  }

  onUploadImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.setImageFile(file, () => input.value = '');
  }

  onDropImage(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    this.setImageFile(file);
  }

  onDragOverImage(event: DragEvent) {
    event.preventDefault();
  }

  removeImage() {
    this.selectedFile = null;
    this.imageError.set(null);
    this.previewUrl.set(null);
    this.assetForm.patchValue({ photoUrl: '' });
  }

  private setImageFile(file: File, reset?: () => void) {
    this.imageError.set(null);

    if (!this.isAllowedImage(file)) {
      reset?.();
      this.imageError.set('Formato no permitido. Usa JPG, PNG, WEBP, GIF, HEIC o HEIF.');
      this.notifSvc.error(this.imageError() || 'Formato de imagen inválido.');
      return;
    }

    if (file.size > ASSET_IMAGE_MAX_SIZE) {
      reset?.();
      this.imageError.set('La imagen no debe superar 3MB.');
      this.notifSvc.error(this.imageError() || 'Imagen demasiado pesada.');
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(String(reader.result));
    reader.readAsDataURL(file);
  }

  private isAllowedImage(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return (file.type ? ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) : false) || ALLOWED_IMAGE_EXT.has(ext);
  }

  onSave() {
    if (this.assetForm.invalid) {
      this.assetForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    if (this.imageError()) {
      this.saving.set(false);
      this.notifSvc.error(this.imageError() || 'Revise la imagen seleccionada.');
      return;
    }

    let s = this.assetForm.value;
    let e = this.asset();

    if (e) {
      this.assetSvc.update(e.id, { ...s, id: e.id }, this.selectedFile ?? undefined).subscribe({
        next: () => {
          this.notifSvc.success('Activo actualizado correctamente.');
          this.saved.emit();
          this.onClose();
          this.saving.set(false);
        },
        error: () => {
          this.notifSvc.error('Error al actualizar activo.');
          this.saving.set(false);
        }
      });
    } else {
      this.assetSvc.create(s, this.selectedFile ?? undefined).subscribe({
        next: () => {
          this.notifSvc.success('Nuevo activo registrado.');
          this.saved.emit();
          this.onClose();
          this.saving.set(false);
        },
        error: () => {
          this.notifSvc.error('Error al registrar activo.');
          this.saving.set(false);
        }
      });
    }
  }
}
