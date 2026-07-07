import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { TicketService } from '../../../core/services/ticket.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { AssetService } from '../../../core/services/asset.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { TokenService } from '../../../core/services/token.service';
import { AIService } from '../../../core/services/ai.service';
import { CatalogItem, AssetSummary, ReturnValue, CreateTicketDto, UserSummary } from '../../../core/models';
import { getControlError, MAXLEN } from '../../../core/validators/app-validators';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './ticket-create.component.html'
})
export class TicketCreate implements OnInit {
  private fb        = inject(FormBuilder);
  private router    = inject(Router);
  private ticketSvc = inject(TicketService);
  private catSvc    = inject(CatalogService);
  private assetSvc  = inject(AssetService);
  private userSvc   = inject(UserService);
  private tokenSvc  = inject(TokenService);
  private notifSvc  = inject(NotificationService);
  private aiSvc     = inject(AIService);

  loadingMetadata = signal(false);
  submitting = signal(false);
  analyzing = signal(false);
  aiResult = signal<{ category?: string; priority?: string; summary?: string; action?: string } | null>(null);
  isInternal = signal(false);

  ticketTypes = signal<CatalogItem[]>([]);
  priorities  = signal<CatalogItem[]>([]);
  assets      = signal<AssetSummary[]>([]);
  assetQuery  = signal('');
  users       = signal<UserSummary[]>([]);
  filteredAssets = computed(() => {
    const q = this.assetQuery().trim().toLowerCase();
    if (!q) return this.assets();
    return this.assets().filter(asset =>
      [
        asset.assetTag,
        asset.serialNumber,
        asset.typeName,
        asset.statusName,
        asset.assignedToName,
        asset.locationName
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    );
  });

  ticketForm: FormGroup = this.fb.group({
    subject:     ['', [Validators.required, Validators.minLength(5), Validators.maxLength(MAXLEN.TITLE)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(MAXLEN.TEXT)]],
    typeItemId:  ['', Validators.required],
    priorityItemId: ['', Validators.required],
    assetId:     [null],
    requesterId: [null]
  });

  ngOnInit() { 
    const user = this.tokenSvc.getUser();
    this.isInternal.set(user?.isInternal || false);
    
    if (this.isInternal()) {
      this.ticketForm.get('requesterId')?.setValidators(Validators.required);
    } else {
      this.ticketForm.patchValue({ requesterId: user?.userId });
    }

    this.loadMetadata(); 
  }

  private loadMetadata() {
    this.loadingMetadata.set(true);
    
    const requests: any = {
      types: this.catSvc.getGroupItems('TICKET_TYPE').pipe(catchError(() => of({ 
        success: true, message: '', code: '', argument: '', id: '', data: [] 
      } as ReturnValue<CatalogItem[]>))),
      priorities: this.catSvc.getGroupItems('TICKET_PRIORITY').pipe(catchError(() => of({ 
        success: true, message: '', code: '', argument: '', id: '', data: [] 
      } as ReturnValue<CatalogItem[]>))),
      assets: this.assetSvc.getAll().pipe(catchError(() => of({ 
        success: true, message: '', code: '', argument: '', id: '', data: [] 
      } as ReturnValue<AssetSummary[]>)))
    };

    if (this.isInternal()) {
      requests.users = this.userSvc.getAll().pipe(catchError(() => of({ 
        success: true, message: '', code: '', argument: '', id: '', data: [] 
      } as ReturnValue<UserSummary[]>)));
    }
    
    forkJoin(requests).subscribe({
      next: (res: any) => {
        if (res.types.success) this.ticketTypes.set(res.types.data || []);
        
        if (res.priorities.success && res.priorities.data) {
          const priorities = res.priorities.data;
          this.priorities.set(priorities);
          const med = priorities.find((p: CatalogItem) => p.code === 'MEDIUM');
          this.ticketForm.patchValue({ priorityItemId: med?.id || (priorities.length > 0 ? priorities[0].id : null) });
        }
        
        if (res.assets.success) this.assets.set(res.assets.data || []);
        if (res.users?.success) this.users.set(res.users.data || []);
        
        this.loadingMetadata.set(false);
      },
      error: () => {
        this.notifSvc.error('Error al cargar metadatos.');
        this.loadingMetadata.set(false);
      }
    });
  }

  isFieldInvalid(field: string) {
    const ctrl = this.ticketForm.get(field);
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  getFieldError(field: string, label: string): string {
    return getControlError(this.ticketForm.get(field), label);
  }

  onAssetSearch(event: Event) {
    this.assetQuery.set((event.target as HTMLInputElement).value);
  }

  onSave() {
    if (this.ticketForm.invalid) { this.ticketForm.markAllAsTouched(); return; }
    
    this.submitting.set(true);
    const val = this.ticketForm.getRawValue();
    const payload: CreateTicketDto = { 
      subject: val.subject,
      description: val.description,
      typeItemId: val.typeItemId,
      priorityItemId: val.priorityItemId,
      assetId: val.assetId || null,
      requesterId: val.requesterId
    };

    this.ticketSvc.create(payload).subscribe({
      next: (res: ReturnValue<string>) => {
        if (res.success) {
          this.notifSvc.success('Ticket creado correctamente.');
          this.router.navigate(['/tickets']);
        } else {
          this.notifSvc.error(res.message || 'Error al procesar el ticket.');
          this.submitting.set(false);
        }
      },
      error: () => {
        this.notifSvc.error('Error de comunicación.');
        this.submitting.set(false);
      }
    });
  }

  onAnalyzeWithAI() {
    const subject = String(this.ticketForm.get('subject')?.value ?? '').trim();
    const description = String(this.ticketForm.get('description')?.value ?? '').trim();

    if (subject.length < 5 || description.length < 20) {
      this.ticketForm.get('subject')?.markAsTouched();
      this.ticketForm.get('description')?.markAsTouched();
      this.notifSvc.warning('Ingresa asunto y descripción antes de analizar con IA.');
      return;
    }

    this.analyzing.set(true);
    this.aiSvc.analyzeTicket(subject, description).subscribe({
      next: (res) => {
        this.analyzing.set(false);
        if (!res.success || !res.data) {
          this.notifSvc.error(this.aiErrorMessage(res.message));
          return;
        }

        const parsed = this.parseAIResult(res.data);
        this.aiResult.set(parsed);
        this.applySuggestedPriority(parsed.priority);
      },
      error: (err) => {
        this.analyzing.set(false);
        this.notifSvc.error(this.aiErrorMessage(err?.error?.message || err?.message));
      }
    });
  }

  private aiErrorMessage(message?: string): string {
    const raw = String(message || '').toLowerCase();
    if (!raw) return 'No se pudo analizar el ticket con IA. Intenta nuevamente.';
    if (raw.includes('503') || raw.includes('unavailable') || raw.includes('overloaded') || raw.includes('demand')) {
      return 'La IA está temporalmente saturada. Intenta nuevamente en unos minutos.';
    }
    if (raw.includes('quota') || raw.includes('cuota') || raw.includes('billing')) {
      return 'La cuota del proveedor de IA está agotada o requiere configuración de billing.';
    }
    if (raw.includes('api key') || raw.includes('key')) {
      return 'La clave de IA no está configurada o no es válida.';
    }
    return 'No se pudo analizar el ticket con IA. Revisa la configuración o intenta nuevamente.';
  }

  private parseAIResult(value: string): { category?: string; priority?: string; summary?: string; action?: string } {
    const clean = String(value || '')
      .replace(/```json|```/gi, '')
      .trim();

    const jsonText = this.extractJsonObject(clean);
    const parsed = this.tryParseJson(jsonText || clean);

    if (parsed) {
      return {
        category: this.cleanAIText(parsed.category ?? parsed.categoria),
        priority: this.cleanAIText(parsed.priority ?? parsed.prioridad),
        summary: this.cleanAIText(parsed.summary ?? parsed.resumen ?? parsed.analysis ?? parsed.analisis),
        action: this.cleanAIText(parsed.recommended_action ?? parsed.action ?? parsed.accion ?? parsed.next_step)
      };
    }

    return {
      summary: this.cleanAIText(clean) || 'La IA analizó el caso y generó una recomendación para soporte.',
      action: 'Revisar el detalle, validar prioridad y derivar al técnico responsable.'
    };
  }

  private extractJsonObject(text: string): string {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first < 0 || last <= first) return '';
    return text.slice(first, last + 1);
  }

  private tryParseJson(text: string): any | null {
    try { return JSON.parse(text); } catch { return null; }
  }

  private cleanAIText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map(v => this.cleanAIText(v)).filter(Boolean).join(' · ');
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${this.cleanAIText(val)}`)
        .filter(Boolean)
        .join(' · ');
    }
    return String(value)
      .replace(/[{}"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private applySuggestedPriority(priority?: string) {
    if (!priority) return;
    const normalized = priority.toUpperCase();
    const map: Record<string, string[]> = {
      URGENTE: ['CRITICAL', 'URGENT', 'ALTA'],
      ALTA: ['HIGH', 'ALTA'],
      MEDIA: ['MEDIUM', 'MEDIA'],
      BAJA: ['LOW', 'BAJA'],
    };
    const match = this.priorities().find(p => {
      const code = (p.code || '').toUpperCase();
      const name = (p.name || '').toUpperCase();
      return code === normalized || name === normalized || Object.entries(map).some(([k, vals]) => k === normalized && vals.includes(code));
    });
    if (match) this.ticketForm.patchValue({ priorityItemId: match.id });
  }

  onGoBack() { this.router.navigate(['/tickets']); }
}
