import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfigService, ConfigSaveDto } from '../../../../core/services/config.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { TenantConfig } from '../../../../core/models';
import { getControlError, MAXLEN } from '../../../../core/validators/app-validators';

@Component({
  selector: 'app-config-ai',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="config-section-content">
      <div class="section-header">
        <div class="icon-box">
          <lucide-angular name="zap" [size]="20"></lucide-angular>
        </div>
        <div>
          <h2 class="section-title">Servicios de Inteligencia Artificial</h2>
          <p class="section-desc">Configura las APIs para automatización de tickets y base de conocimientos.</p>
        </div>
      </div>

      <div class="sm-divider"></div>

      @if (loading()) {
        <div class="config-loading-state">
          <lucide-angular name="loader" class="spinner" [size]="22"></lucide-angular>
          <span>Cargando servicios IA...</span>
        </div>
      }

      <form [formGroup]="aiForm" class="config-form" [class.config-loading-dim]="loading()">
        <div class="config-grid">
          <div class="sm-field">
            <label class="sm-label">Proveedor Predeterminado</label>
            <select class="sm-input" formControlName="provider">
              <option value="GEMINI">Google Gemini</option>
              <option value="CLAUDE">Anthropic Claude</option>
              <option value="OPENAI">OpenAI ChatGPT</option>
              <option value="DEEPSEEK">DeepSeek</option>
            </select>
          </div>

          <div class="sm-field full-width">
            <label class="sm-label">Google Gemini API Key</label>
            <div class="sm-input-wrap">
              <input [type]="showKey() ? 'text' : 'password'" class="sm-input" formControlName="geminiKey" placeholder="AIza..." [class.input-error]="fieldError('geminiKey', 'API Key de Gemini')">
              <button type="button" class="sm-input-icon right btn-icon-wrap" (click)="showKey.set(!showKey())">
                <lucide-angular [name]="showKey() ? 'eye-off' : 'eye'" [size]="16"></lucide-angular>
              </button>
            </div>
            @if (fieldError('geminiKey', 'API Key de Gemini')) { <span class="field-error">{{ fieldError('geminiKey', 'API Key de Gemini') }}</span> }
            <p class="field-help">Esta clave será usada por el backend para automatizaciones y asistencia IA cuando el proveedor sea Google Gemini.</p>
          </div>

          <div class="sm-field">
            <label class="sm-label">Nombre de la clave Google</label>
            <input class="sm-input" formControlName="geminiKeyName" placeholder="Gemini API Key">
          </div>

          <div class="sm-field">
            <label class="sm-label">Proyecto Google</label>
            <input class="sm-input" formControlName="googleProjectName" placeholder="projects/000000000000">
          </div>

          <div class="sm-field">
            <label class="sm-label">Número de proyecto</label>
            <input class="sm-input" formControlName="googleProjectNumber" placeholder="000000000000" [class.input-error]="fieldError('googleProjectNumber', 'El número de proyecto')">
            @if (fieldError('googleProjectNumber', 'El número de proyecto')) { <span class="field-error">{{ fieldError('googleProjectNumber', 'El número de proyecto') }}</span> }
          </div>

          <div class="sm-field full-width">
            <label class="sm-label">API Key (Claude)</label>
            <input type="password" class="sm-input" formControlName="claudeKey" placeholder="sk-ant-...">
          </div>

          <div class="sm-field full-width">
            <label class="sm-label">API Key (OpenAI)</label>
            <input type="password" class="sm-input" formControlName="openaiKey" placeholder="sk-...">
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-primary" (click)="onSave()" [disabled]="saving() || aiForm.invalid">
            <lucide-angular [name]="saving() ? 'loader' : 'save'" [class.spinner]="saving()" [size]="16"></lucide-angular>
            <span>Guardar Configuración IA</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class ConfigAI implements OnInit {
  private configSvc = inject(ConfigService);
  private notifSvc = inject(NotificationService);
  
  loading = signal(false);
  saving = signal(false);
  showKey = signal(false);

  aiForm = new FormGroup({
    provider:            new FormControl('GEMINI'),
    geminiKey:           new FormControl('', [Validators.required, Validators.maxLength(MAXLEN.GENERIC)]),
    geminiKeyName:       new FormControl(''),
    googleProjectName:   new FormControl(''),
    googleProjectNumber: new FormControl('', [Validators.pattern(/^[0-9]+$/), Validators.maxLength(MAXLEN.CODE)]),
    claudeKey:           new FormControl(''),
    openaiKey:           new FormControl(''),
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.configSvc.getByGroup('AI').subscribe({
      next: res => {
        if (res.success && res.data) {
          const cfg = res.data;
          this.aiForm.patchValue({
            provider:            this.findVal(cfg, 'AI_PROVIDER', 'GEMINI'),
            geminiKey:           this.findVal(cfg, 'AI_GEMINI_KEY'),
            geminiKeyName:       this.findVal(cfg, 'AI_GEMINI_KEY_NAME'),
            googleProjectName:   this.findVal(cfg, 'AI_GOOGLE_PROJECT_NAME'),
            googleProjectNumber: this.findVal(cfg, 'AI_GOOGLE_PROJECT_NUMBER'),
            claudeKey:           this.findVal(cfg, 'AI_CLAUDE_KEY'),
            openaiKey:           this.findVal(cfg, 'AI_OPENAI_KEY'),
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
    return getControlError(this.aiForm.get(name), label);
  }

  onSave() {
    if (this.aiForm.invalid) {
      this.aiForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const sv = this.aiForm.value;
    
    const configs: ConfigSaveDto[] = [
      { configGroup: 'AI', configKey: 'AI_PROVIDER', configValue: sv.provider!, valueType: 'STRING', description: 'Proveedor de IA activo', isSensitive: false },
      { configGroup: 'AI', configKey: 'AI_GEMINI_KEY', configValue: sv.geminiKey!, valueType: 'STRING', description: 'Google Gemini API Key', isSensitive: true },
      { configGroup: 'AI', configKey: 'AI_GEMINI_KEY_NAME', configValue: sv.geminiKeyName!, valueType: 'STRING', description: 'Nombre de la clave Google Gemini', isSensitive: false },
      { configGroup: 'AI', configKey: 'AI_GOOGLE_PROJECT_NAME', configValue: sv.googleProjectName!, valueType: 'STRING', description: 'Proyecto Google asociado', isSensitive: false },
      { configGroup: 'AI', configKey: 'AI_GOOGLE_PROJECT_NUMBER', configValue: sv.googleProjectNumber!, valueType: 'STRING', description: 'Número de proyecto Google', isSensitive: false },
      { configGroup: 'AI', configKey: 'AI_CLAUDE_KEY', configValue: sv.claudeKey!, valueType: 'STRING', description: 'Anthropic Claude API Key', isSensitive: true },
      { configGroup: 'AI', configKey: 'AI_OPENAI_KEY', configValue: sv.openaiKey!, valueType: 'STRING', description: 'OpenAI API Key', isSensitive: true },
    ];

    let pending = configs.length;
    let anyError = false;
    let lastMsg = '';

    configs.forEach(c => {
      // Solo guardar si tiene valor o no es "********" (que significa que ya hay uno guardado)
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
            else this.notifSvc.success(lastMsg || 'Servicios IA actualizados');
          }
        }
      });
    });
  }
}
