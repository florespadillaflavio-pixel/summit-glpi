import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';
import { getControlError } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-config-storage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="config-section-content">
      <div class="section-header">
        <div class="icon-box">
          <lucide-angular name="cloud-upload" [size]="20"></lucide-angular>
        </div>
        <div>
          <h2 class="section-title">Almacenamiento de Archivos</h2>
          <p class="section-desc">Gestiona dónde se guardan los adjuntos, logos y avatares.</p>
        </div>
      </div>

      <div class="sm-divider"></div>

      @if (loading()) {
        <div class="config-loading-state">
          <lucide-angular name="loader" class="spinner" [size]="22"></lucide-angular>
          <span>Cargando almacenamiento...</span>
        </div>
      }

      <form [formGroup]="storageForm" class="config-form" [class.config-loading-dim]="loading()">
        <div class="config-grid">
          <div class="sm-field">
            <label class="sm-label">Proveedor de Almacenamiento</label>
            <select class="sm-input" formControlName="provider">
              <option value="CLOUDINARY">Cloudinary (Recomendado)</option>
              <option value="S3">Amazon S3</option>
              <option value="LOCAL">Local Server</option>
            </select>
          </div>

          @if (storageForm.get('provider')?.value === 'CLOUDINARY') {
            <div class="sm-field">
              <label class="sm-label">Cloud Name</label>
              <input class="sm-input" formControlName="cloudName" placeholder="dvqt1zkla" [class.input-error]="fieldError('cloudName', 'Cloud Name')">
              @if (fieldError('cloudName', 'Cloud Name')) { <span class="field-error">{{ fieldError('cloudName', 'Cloud Name') }}</span> }
            </div>
            <div class="sm-field">
              <label class="sm-label">API Key</label>
              <input type="password" class="sm-input" formControlName="apiKey" placeholder="Cloudinary API Key" [class.input-error]="fieldError('apiKey', 'API Key')">
              @if (fieldError('apiKey', 'API Key')) { <span class="field-error">{{ fieldError('apiKey', 'API Key') }}</span> }
            </div>
            <div class="sm-field full-width">
              <label class="sm-label">API Secret</label>
              <input type="password" class="sm-input" formControlName="apiSecret" placeholder="Cloudinary API Secret" [class.input-error]="fieldError('apiSecret', 'API Secret')">
              @if (fieldError('apiSecret', 'API Secret')) { <span class="field-error">{{ fieldError('apiSecret', 'API Secret') }}</span> }
              <p class="field-help">Estos valores se guardan cifrados y serán usados automáticamente por la carga de logos, avatares y adjuntos.</p>
            </div>
          }
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-primary" (click)="onSave()" [disabled]="saving() || storageForm.invalid">
            <lucide-angular [name]="saving() ? 'loader' : 'save'" [class.spinner]="saving()" [size]="16"></lucide-angular>
            <span>Guardar Configuración de Archivos</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class ConfigStorage implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  loading = signal(false);
  saving = signal(false);

  storageForm = new FormGroup({
    provider:  new FormControl('CLOUDINARY'),
    cloudName: new FormControl('', [Validators.required]),
    apiKey:    new FormControl('', [Validators.required]),
    apiSecret: new FormControl('', [Validators.required]),
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('STORAGE').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.storageForm.patchValue({
            provider:  this.findVal(cfg, 'STORAGE_PROVIDER', 'CLOUDINARY'),
            cloudName: this.findVal(cfg, 'STORAGE_CLOUD_NAME'),
            apiKey:    this.findVal(cfg, 'STORAGE_API_KEY'),
            apiSecret: this.findVal(cfg, 'STORAGE_API_SECRET'),
          });
        }
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false)
    });
  }

  findVal(list: TenantConfig[], key: string, def: string = ''): string {
    return list.find(x => x.configKey === key)?.configValue ?? def;
  }

  fieldError(name: string, label: string): string {
    return getControlError(this.storageForm.get(name), label);
  }

  onSave() {
    if (this.storageForm.invalid) {
      this.storageForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const sv = this.storageForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'STORAGE', configKey: 'STORAGE_PROVIDER', configValue: sv.provider!, valueType: 'STRING', description: 'Proveedor de almacenamiento', isSensitive: false },
      { configGroup: 'STORAGE', configKey: 'STORAGE_CLOUD_NAME', configValue: sv.cloudName!, valueType: 'STRING', description: 'Nombre de la nube', isSensitive: false },
      { configGroup: 'STORAGE', configKey: 'STORAGE_API_KEY', configValue: sv.apiKey!, valueType: 'STRING', description: 'API Key', isSensitive: true },
      { configGroup: 'STORAGE', configKey: 'STORAGE_API_SECRET', configValue: sv.apiSecret!, valueType: 'STRING', description: 'API Secret', isSensitive: true },
    ];

    let pending = configs.length;
    let anyError = false;
    let lastMsg = '';

    configs.forEach(c => {
      if (c.configValue === '********') {
        if (--pending === 0) {
            this.saving.set(false);
            if (!anyError) this.notifSvc.success(lastMsg || 'Configuración guardada');
        }
        return;
      }

      this.configSvc.save(c).subscribe({
        next: (res) => {
          lastMsg = res.message;
          if (!res.success) anyError = true;
        },
        error: () => anyError = true,
        complete: () => {
          if (--pending === 0) {
            this.saving.set(false);
            if (anyError) this.notifSvc.error('Error al guardar algunos campos');
            else this.notifSvc.success(lastMsg || 'Almacenamiento actualizado');
          }
        }
      });
    });
  }
}
