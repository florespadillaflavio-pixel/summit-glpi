import { Component, signal, computed, inject, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TicketService } from '../../../core/services/ticket.service';
import { AssetService } from '../../../core/services/asset.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { UserService } from '../../../core/services/user.service';
import { TokenService } from '../../../core/services/token.service';
import { NotificationService } from '../../../core/services/ui/notification.service';
import { AIService } from '../../../core/services/ai.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

import { TicketDetail as TicketDetailModel, TicketComment, TicketHistory, ReturnValue, CatalogItem, UserSummary, Asset } from '../../../core/models';
import { getControlError, MAXLEN } from '../../../core/validators/app-validators';

type ActivityItem = TicketHistory & { changes: Array<{ label: string; before: string; after: string }> };
type ChatMessage = TicketComment & { pending?: boolean };
type WorkflowAction = {
  code: string;
  label: string;
  description: string;
  icon: string;
  tone: 'primary' | 'teal' | 'ghost';
};

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, MatDialogModule],
  templateUrl: './ticket-detail.component.html'
})
export class TicketDetail implements OnInit, OnDestroy, AfterViewChecked {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private ticketSvc = inject(TicketService);
  private assetSvc  = inject(AssetService);
  private realtimeSvc = inject(RealtimeService);
  private catSvc    = inject(CatalogService);
  private userSvc   = inject(UserService);
  private fb        = inject(FormBuilder);
  private tokenSvc  = inject(TokenService);
  public  notifSvc  = inject(NotificationService);
  private dialog    = inject(MatDialog);
  private aiSvc     = inject(AIService);
  @ViewChild('chatScroller') private chatScroller?: ElementRef<HTMLElement>;
  @ViewChild('historyScroller') private historyScroller?: ElementRef<HTMLElement>;

  ticketId = this.route.snapshot.paramMap.get('id') ?? '';
  activeTab = signal<'conversation' | 'notes' | 'history'>('conversation');
  editing = signal(false);
  savingEdit = signal(false);
  assigning = signal(false);
  resolving = signal(false);
  closing = signal(false);
  changingStatus = signal('');
  analyzing = signal(false);
  sendingReply = signal(false);
  sendingNote = signal(false);
  pendingReplyText = signal('');
  pendingNoteText = signal('');
  showAssignPanel = signal(false);
  showOptions = signal(false);
  
  @HostListener('document:click')
  onDocumentClick() {
    this.showOptions.set(false);
  }
  
  replyCtrl = new FormControl('', [Validators.required, Validators.maxLength(MAXLEN.TEXT)]);
  noteCtrl  = new FormControl('', [Validators.required, Validators.maxLength(MAXLEN.TEXT)]);

  loading  = signal(true);
  notFound = signal(false);

  ticket = signal<TicketDetailModel | null>(null);
  linkedAsset = signal<Asset | null>(null);
  allComments = signal<TicketComment[]>([]);
  history = signal<ActivityItem[]>([]);
  ticketTypes = signal<CatalogItem[]>([]);
  priorities = signal<CatalogItem[]>([]);
  statuses = signal<CatalogItem[]>([]);
  technicians = signal<UserSummary[]>([]);
  selectedAssigneeId = signal('');
  private realtimeEvents = ['ticket-updated', 'ticket-status-changed', 'ticket-assigned', 'ticket-comment-added', 'ticket-note-added'];
  private lastChatCount = 0;
  private lastNoteCount = 0;
  private lastHistoryCount = 0;
  private lastActiveTab: 'conversation' | 'notes' | 'history' = 'conversation';
  private slaTimer?: ReturnType<typeof setInterval>;
  nowTick = signal(Date.now());

  editForm = this.fb.group({
    subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(MAXLEN.TITLE)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(MAXLEN.TEXT)]],
    typeItemId: ['', Validators.required],
    priorityItemId: ['', Validators.required],
  });

  getFieldError(field: string, label: string): string {
    return getControlError(this.editForm.get(field), label);
  }

  comments = computed(() => this.allComments().filter(c => !c.isInternal));
  internalNotes = computed(() => this.allComments().filter(c => c.isInternal));
  isClosed = computed(() => (this.ticket()?.statusCode || '').toUpperCase() === 'CLOSED');
  isResolved = computed(() => (this.ticket()?.statusCode || '').toUpperCase() === 'RESOLVED');
  canClose = computed(() => this.isResolved() && !this.isClosed());
  currentStatusCode = computed(() => (this.ticket()?.statusCode || '').toUpperCase());
  statusPhaseLabel = computed(() => {
    if (this.isClosed()) return 'Cerrado';
    if (this.isResolved()) return 'Resuelto';
    return 'Activo';
  });
  statusPhaseColor = computed(() => {
    if (this.isClosed()) return '#64748b';
    if (this.isResolved()) return '#16a34a';
    return this.ticket()?.statusColor || '#5AAFB8';
  });
  technicalStatusLabel = computed(() => this.ticket()?.statusName || 'En atención');
  isRequester = computed(() => this.tokenSvc.getUser()?.userId === this.ticket()?.requesterId);
  isSupportUser = computed(() => {
    const user = this.tokenSvc.getUser();
    const role = (user?.role || '').toUpperCase();
    return !this.isRequester()
      && (
        this.tokenSvc.hasPermission('TICKET_UPDATE')
        || this.tokenSvc.hasPermission('TICKET_ASSIGN')
        || this.tokenSvc.hasPermission('TICKET_MANAGE')
        || ['ADMINISTRADOR', 'ADMIN', 'TECHNICIAN', 'TECNICO', 'SUPERVISOR'].includes(role)
      );
  });
  canManageTicket = computed(() => this.isSupportUser());
  canUseInternalNotes = computed(() => this.isSupportUser());
  canUseAI = computed(() => this.isSupportUser());
  supportNeedsAssignment = computed(() => this.isSupportUser() && !this.ticket()?.assignedToId && !this.isClosed());
  supportCanInteract = computed(() => !this.supportNeedsAssignment());
  workflowActorLabel = computed(() => this.isRequester() ? 'Vista solicitante' : 'Vista soporte');
  workflowActions = computed<WorkflowAction[]>(() => {
    if (this.isClosed()) return [];
    if (this.supportNeedsAssignment()) return [];
    const status = this.currentStatusCode();
    const support = this.isSupportUser();
    const requester = this.isRequester();

    if (requester) {
      if (status === 'WAITING') {
        return [{
          code: 'IN_PROGRESS',
          label: 'Respondí al soporte',
          description: 'Devuelve el caso a atención del equipo técnico.',
          icon: 'message-circle',
          tone: 'teal'
        }];
      }
      if (status === 'RESOLVED') {
        return [
          {
            code: 'CLOSED',
            label: 'Confirmar cierre',
            description: 'Acepta la solución y finaliza el caso.',
            icon: 'lock',
            tone: 'primary'
          },
          {
            code: 'IN_PROGRESS',
            label: 'No quedó resuelto',
            description: 'Reabre la atención para que soporte continúe.',
            icon: 'refresh-cw',
            tone: 'ghost'
          }
        ];
      }
      return [];
    }

    if (!support) return [];

    if (status === 'OPEN' || status === 'PENDING') {
      return [{
        code: 'IN_PROGRESS',
        label: 'Tomar atención',
        description: 'Marca que soporte ya está trabajando el ticket.',
        icon: 'play',
        tone: 'teal'
      }];
    }
    if (status === 'IN_PROGRESS') {
      return [
        {
          code: 'WAITING',
          label: 'Esperar respuesta cliente',
          description: 'Usa este estado cuando soporte ya respondió y necesita datos del usuario.',
          icon: 'pause',
          tone: 'ghost'
        },
        {
          code: 'RESOLVED',
          label: 'Marcar resuelto',
          description: 'La solución fue aplicada y queda pendiente de cierre.',
          icon: 'check-circle',
          tone: 'teal'
        }
      ];
    }
    if (status === 'WAITING') {
      return [{
        code: 'IN_PROGRESS',
        label: 'Retomar atención',
        description: 'El cliente respondió o soporte continuará el análisis.',
        icon: 'refresh-cw',
        tone: 'teal'
      }];
    }
    if (status === 'RESOLVED') {
      return [
        {
          code: 'CLOSED',
          label: 'Cerrar ticket',
          description: 'Finaliza el caso y lo deja en modo solo lectura.',
          icon: 'lock',
          tone: 'primary'
        },
        {
          code: 'IN_PROGRESS',
          label: 'Reabrir atención',
          description: 'Vuelve a trabajar el caso si la solución no aplica.',
          icon: 'refresh-cw',
          tone: 'ghost'
        }
      ];
    }
    return [];
  });
  assignButtonText = computed(() => this.ticket()?.assignedToId ? 'Cambiar técnico' : 'Asignar');
  assignedTechnicianText = computed(() => {
    const t = this.ticket();
    if (!t?.assignedToId) return 'Sin asignar';
    const tech = this.technicians().find(u => u.id === t.assignedToId);
    return tech?.fullName || t.assignedToName || 'Técnico asignado';
  });
  currentUserInitials = computed(() => {
    const user = this.tokenSvc.getUser();
    const first = user?.firstName || '';
    const last = user?.lastName || '';
    return this.initials(`${first} ${last}`.trim() || user?.username || 'Yo');
  });
  conversationMessages = computed<ChatMessage[]>(() => {
    const pending = this.pendingReplyText();
    return pending
      ? [...this.comments(), this.pendingMessage(pending, false)]
      : this.comments();
  });
  noteMessages = computed<ChatMessage[]>(() => {
    const pending = this.pendingNoteText();
    return pending
      ? [...this.internalNotes(), this.pendingMessage(pending, true)]
      : this.internalNotes();
  });
  latestActivity = computed(() => {
    const dates = [
      this.ticket()?.createdAt,
      ...this.allComments().map(c => c.createdAt)
    ].filter(Boolean).map(d => new Date(d as string | Date).getTime()).filter(d => !Number.isNaN(d));

    if (!dates.length) return '';
    return this.formatDate(new Date(Math.max(...dates)));
  });
  slaTotalMinutes = computed(() => {
    const priority = (this.ticket()?.priorityCode || '').toUpperCase();
    if (priority === 'CRITICAL') return 60;
    if (priority === 'HIGH') return 4 * 60;
    if (priority === 'MEDIUM') return 8 * 60;
    if (priority === 'LOW') return 24 * 60;
    return 8 * 60;
  });
  slaTotalSeconds = computed(() => this.slaTotalMinutes() * 60);
  slaElapsedSeconds = computed(() => {
    const createdAt = this.ticket()?.createdAt;
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return 0;
    return Math.max(0, Math.floor((this.nowTick() - created) / 1000));
  });
  slaElapsedMinutes = computed(() => Math.floor(this.slaElapsedSeconds() / 60));
  slaPercent = computed(() => {
    const total = this.slaTotalSeconds();
    if (!total) return 0;
    return Math.min(100, Math.round((this.slaElapsedSeconds() / total) * 100));
  });
  slaRemainingText = computed(() => {
    const remaining = this.slaTotalSeconds() - this.slaElapsedSeconds();
    if (remaining <= 0) return 'SLA vencido';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    if (hours <= 0 && minutes <= 0) return `${seconds}s restantes`;
    if (hours <= 0) return `${minutes}m ${seconds}s restantes`;
    return `${hours}h ${minutes}m ${seconds}s restantes`;
  });
  slaStateText = computed(() => {
    if (this.slaElapsedSeconds() >= this.slaTotalSeconds()) return 'Vencido';
    if (this.slaPercent() >= 80) return 'En riesgo';
    if (this.slaPercent() >= 55) return 'En seguimiento';
    return 'En tiempo';
  });
  slaStateClass = computed(() => {
    if (this.slaElapsedSeconds() >= this.slaTotalSeconds()) return 'danger';
    if (this.slaPercent() >= 80) return 'warning';
    if (this.slaPercent() >= 55) return 'info';
    return 'success';
  });
  slaBarColor = computed(() => {
    const state = this.slaStateClass();
    if (state === 'danger') return '#dc2626';
    if (state === 'warning') return '#f59e0b';
    if (state === 'info') return '#3b82f6';
    return '#16a34a';
  });

  ngOnInit(): void {
    if (!this.ticketId) { this.loading.set(false); this.notFound.set(true); return; }
    this.slaTimer = setInterval(() => this.nowTick.set(Date.now()), 1000);
    this.loadMetadata();
    this.loadAll();
    this.realtimeSvc.connectTickets()
      .then(() => {
        for (const eventName of this.realtimeEvents) {
          this.realtimeSvc.on(eventName, this.onRealtimeTicketChange);
        }
      })
      .catch(() => this.notifSvc.warning('No se pudo iniciar la sincronización en tiempo real.'));
  }

  ngOnDestroy(): void {
    if (this.slaTimer) clearInterval(this.slaTimer);
    for (const eventName of this.realtimeEvents) {
      this.realtimeSvc.off(eventName, this.onRealtimeTicketChange);
    }
  }

  ngAfterViewChecked(): void {
    this.syncScrollPosition();
  }

  private loadMetadata() {
    this.catSvc.getGroupItems('TICKET_TYPE').subscribe(res => {
      if (res.success && res.data) this.ticketTypes.set(res.data);
    });
    this.catSvc.getGroupItems('TICKET_PRIORITY').subscribe(res => {
      if (res.success && res.data) this.priorities.set(res.data);
    });
    this.catSvc.getGroupItems('TICKET_STATUS').subscribe(res => {
      if (res.success && res.data) this.statuses.set(res.data);
    });
    this.userSvc.getAll().subscribe(res => {
      const currentCompanyId = this.tokenSvc.getUser()?.companyId || '';
      if (res.success && res.data) {
        this.technicians.set(res.data.filter(u =>
          u.isActive
          && (!currentCompanyId || u.companyId === currentCompanyId)
          && (u.role || '').trim().toLowerCase() !== 'cliente'
        ));
      }
    });
  }

  private loadAll(showSpinner = true) {
    if (showSpinner) this.loading.set(true);
    this.ticketSvc.getById(this.ticketId).subscribe({
      next: (res: ReturnValue<TicketDetailModel>) => {
        if (res.success && res.data) {
          this.ticket.set(res.data);
          this.loadLinkedAsset(res.data.assetId);
          this.selectedAssigneeId.set(res.data.assignedToId || '');
          this.patchEditForm(res.data);
          this.loadComments(showSpinner);
          this.loadHistory(false);
        } else { this.notFound.set(true); if (showSpinner) this.loading.set(false); }
      },
      error: () => { this.notFound.set(true); if (showSpinner) this.loading.set(false); }
    });
  }

  private loadLinkedAsset(assetId?: string | null) {
    if (!assetId) {
      this.linkedAsset.set(null);
      return;
    }

    this.assetSvc.getById(assetId).subscribe({
      next: (res) => this.linkedAsset.set(res.success && res.data ? res.data : null),
      error: () => this.linkedAsset.set(null)
    });
  }

  private patchEditForm(ticket: TicketDetailModel) {
    this.editForm.patchValue({
      subject: ticket.subject,
      description: ticket.description || '',
      typeItemId: ticket.typeItemId || '',
      priorityItemId: ticket.priorityItemId || '',
    });
  }

  private loadComments(showSpinner = true) {
    this.ticketSvc.getComments(this.ticketId).subscribe({
      next: (res: ReturnValue<TicketComment[]>) => {
        if (res.success && res.data) {
          this.allComments.set(res.data);
          this.queueConversationScroll();
        }
        if (showSpinner) this.loading.set(false);
      },
      error: () => { if (showSpinner) this.loading.set(false); }
    });
  }

  private loadHistory(showSpinner = true) {
    if (showSpinner) this.loading.set(true);
    this.ticketSvc.getHistory(this.ticketId).subscribe({
      next: (res: ReturnValue<TicketHistory[]>) => {
        if (res.success && res.data) {
          this.history.set(res.data.map(item => ({
            ...item,
            changes: this.extractChanges(item)
          })));
          this.queueConversationScroll();
        }
        if (showSpinner) this.loading.set(false);
      },
      error: () => { if (showSpinner) this.loading.set(false); }
    });
  }

  private onRealtimeTicketChange = (payload: { id?: string }) => {
    if (!payload?.id || payload.id !== this.ticketId) return;
    this.loadAll(false);
  };

  historyIcon(item: TicketHistory): string {
    if (item.eventType === 'COMMENT') return 'message-circle';
    if (item.eventType === 'NOTE') return 'lock';
    if (item.action === 'INSERT') return 'plus-circle';
    if (item.action === 'DELETE') return 'trash-2';
    return 'refresh-cw';
  }

  historyClass(item: TicketHistory): string {
    if (item.eventType === 'COMMENT') return 'comment';
    if (item.eventType === 'NOTE') return 'note';
    if (item.action === 'INSERT') return 'create';
    if (item.action === 'DELETE') return 'delete';
    return 'update';
  }

  private extractChanges(item: TicketHistory): Array<{ label: string; before: string; after: string }> {
    if (item.action !== 'UPDATE') return [];

    const oldValues = this.parseJson(item.oldValues);
    const newValues = this.parseJson(item.newValues);
    const labels: Record<string, string> = {
      subject: 'Asunto',
      description: 'Descripción',
      assigned_to_id: 'Asignado a',
      status_item_id: 'Estado',
      priority_item_id: 'Prioridad',
      type_item_id: 'Tipo',
      asset_id: 'Activo',
      due_date: 'Fecha límite',
      sla_breached: 'SLA vencido',
      closed_at: 'Fecha de cierre',
      resolved_at: 'Fecha de resolución'
    };

    return Object.keys(labels)
      .filter(key => JSON.stringify(oldValues[key] ?? null) !== JSON.stringify(newValues[key] ?? null))
      .map(key => ({
        label: labels[key],
        before: this.valueLabel(oldValues[key]),
        after: this.valueLabel(newValues[key])
      }));
  }

  private parseJson(value: string): any {
    try { return value ? JSON.parse(value) : {}; } catch { return {}; }
  }

  private valueLabel(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Vacío';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    const text = String(value);
    const knownUser = this.technicians().find(u => u.id === text);
    if (knownUser) return knownUser.fullName;
    if (this.ticket()?.requesterId === text) return this.ticket()?.requesterName || 'Solicitante';
    const knownStatus = this.statuses().find(s => s.id === text);
    if (knownStatus) return knownStatus.name;
    const knownPriority = this.priorities().find(p => p.id === text);
    if (knownPriority) return knownPriority.name;
    const knownType = this.ticketTypes().find(t => t.id === text);
    if (knownType) return knownType.name;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      return `${text.slice(0, 8)}...${text.slice(-4)}`;
    }
    return text;
  }

  sendReply() {
    const text = this.replyCtrl.value?.trim();
    const user = this.tokenSvc.getUser();
    if (this.isClosed()) {
      this.notifSvc.warning('El ticket está cerrado. No se pueden enviar nuevos mensajes.');
      return;
    }
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de responder el ticket.');
      this.showAssignPanel.set(true);
      return;
    }
    if (!text || !user) return;
    this.sendingReply.set(true);
    this.pendingReplyText.set(text);
    this.replyCtrl.setValue('');
    this.queueActiveScroll();
    this.ticketSvc.addComment(this.ticketId, {
      ticketId: this.ticketId,
      authorId: user.userId,
      body: text,
      isInternal: false,
      attachments: '[]'
    }).subscribe({
      next: () => { 
        this.notifSvc.success('Respuesta enviada.'); 
        this.pendingReplyText.set('');
        this.sendingReply.set(false);
        this.loadComments(false);
        this.loadHistory(false);
        this.advanceRequesterReplyFlow();
      },
      error: () => {
        this.sendingReply.set(false);
        this.pendingReplyText.set('');
        this.replyCtrl.setValue(text);
        this.notifSvc.error('No se pudo enviar la respuesta.');
      }
    });
  }

  addNote() {
    const text = this.noteCtrl.value?.trim();
    const user = this.tokenSvc.getUser();
    if (this.isClosed()) {
      this.notifSvc.warning('El ticket está cerrado. No se pueden registrar notas internas.');
      return;
    }
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de registrar notas internas.');
      this.showAssignPanel.set(true);
      return;
    }
    if (!text || !user) return;
    this.sendingNote.set(true);
    this.pendingNoteText.set(text);
    this.noteCtrl.setValue('');
    this.queueActiveScroll();
    this.ticketSvc.addComment(this.ticketId, {
      ticketId: this.ticketId,
      authorId: user.userId,
      body: text,
      isInternal: true,
      attachments: '[]'
    }).subscribe({
      next: () => { 
        this.notifSvc.success('Nota interna guardada.'); 
        this.pendingNoteText.set('');
        this.sendingNote.set(false);
        this.loadComments(false);
        this.loadHistory(false);
      },
      error: () => {
        this.sendingNote.set(false);
        this.pendingNoteText.set('');
        this.noteCtrl.setValue(text);
        this.notifSvc.error('No se pudo guardar la nota interna.');
      }
    });
  }

  onResolve() {
    if (this.isClosed()) return;
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de resolver el ticket.');
      this.showAssignPanel.set(true);
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar Resolución',
        message: '¿Estás seguro de que deseas marcar este ticket como resuelto? Se notificará al usuario.',
        confirmText: 'Sí, Resolver',
        cancelText: 'Cancelar',
        icon: 'check-circle',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const resolved = this.statuses().find(s => s.code === 'RESOLVED');
        if (!resolved) {
          this.notifSvc.error('No se encontró el estado Resuelto en catálogos.');
          return;
        }

        this.resolving.set(true);
        this.ticketSvc.updateStatus(this.ticketId, resolved.id).subscribe({
          next: (res) => {
            this.resolving.set(false);
            if (res.success) {
              this.notifSvc.success('Ticket resuelto correctamente.');
              this.loadAll(false);
            } else {
              this.notifSvc.error(res.message || 'No se pudo resolver el ticket.');
            }
          },
          error: (err) => {
            this.resolving.set(false);
            this.notifSvc.error(err?.error?.message || 'Error al resolver el ticket.');
          }
        });
      }
    });
  }

  onCloseTicket() {
    if (this.isClosed() || this.closing()) return;
    if (!this.isResolved()) {
      this.notifSvc.warning('Primero marca el ticket como resuelto. Luego podrás cerrarlo.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '560px',
      data: {
        title: 'Cerrar Ticket',
        kicker: 'Cierre definitivo',
        subtitle: this.ticket()?.ticketNumber || 'Mesa de ayuda',
        message: 'Vas a finalizar este caso. Después del cierre quedará protegido en modo solo lectura para conservar la trazabilidad del soporte.',
        items: [
          { label: 'Conversación', value: 'No se podrán enviar nuevos mensajes al usuario.' },
          { label: 'Notas internas', value: 'No se podrán registrar nuevas notas del equipo.' },
          { label: 'Gestión', value: 'No se podrá editar, resolver ni cambiar la asignación.' },
          { label: 'Auditoría', value: 'El cierre quedará registrado en el historial del ticket.' },
        ],
        tone: 'danger',
        confirmText: 'Cerrar ticket',
        cancelText: 'Cancelar',
        icon: 'lock',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      const closed = this.statuses().find(s => s.code === 'CLOSED');
      if (!closed) {
        this.notifSvc.error('No se encontró el estado Cerrado en catálogos.');
        return;
      }

      this.closing.set(true);
      this.ticketSvc.updateStatus(this.ticketId, closed.id).subscribe({
        next: (res) => {
          this.closing.set(false);
          if (res.success) {
            this.notifSvc.success('Ticket cerrado correctamente.');
            this.editing.set(false);
            this.showAssignPanel.set(false);
            this.loadAll(false);
          } else {
            this.notifSvc.error(res.message || 'No se pudo cerrar el ticket.');
          }
        },
        error: (err) => {
          this.closing.set(false);
          this.notifSvc.error(err?.error?.message || 'Error al cerrar el ticket.');
        }
      });
    });
  }

  changeWorkflowStatus(action: WorkflowAction) {
    if (this.isClosed() || this.changingStatus()) return;
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de cambiar el estado.');
      this.showAssignPanel.set(true);
      return;
    }
    if (action.code === 'CLOSED') {
      this.onCloseTicket();
      return;
    }
    const status = this.findStatus(action.code);
    if (!status) {
      this.notifSvc.error(`No se encontró el estado ${action.code} en catálogos.`);
      return;
    }

    this.changingStatus.set(action.code);
    this.ticketSvc.updateStatus(this.ticketId, status.id).subscribe({
      next: (res) => {
        this.changingStatus.set('');
        if (res.success) {
          this.notifSvc.success(`Estado actualizado: ${status.name}.`);
          this.loadAll(false);
        } else {
          this.notifSvc.error(res.message || 'No se pudo actualizar el estado.');
        }
      },
      error: (err) => {
        this.changingStatus.set('');
        this.notifSvc.error(err?.error?.message || 'Error al actualizar el estado.');
      }
    });
  }

  private findStatus(code: string): CatalogItem | undefined {
    const normalized = code.toUpperCase();
    return this.statuses().find(s => (s.code || '').toUpperCase() === normalized);
  }

  private advanceRequesterReplyFlow() {
    if (!this.isRequester() || this.currentStatusCode() !== 'WAITING') return;
    const inProgress = this.findStatus('IN_PROGRESS');
    if (!inProgress) return;
    this.ticketSvc.updateStatus(this.ticketId, inProgress.id).subscribe({
      next: (res) => {
        if (res.success) this.loadAll(false);
      }
    });
  }

  onAssign() {
    const t = this.ticket();
    if (!t || this.isClosed()) return;
    this.selectedAssigneeId.set(t.assignedToId || '');
    this.showAssignPanel.update(v => !v);
  }

  saveAssignment() {
    if (this.assigning() || this.isClosed()) return;
    this.assigning.set(true);
    this.ticketSvc.assign(this.ticketId, this.selectedAssigneeId() || null).subscribe({
      next: (res) => {
        this.assigning.set(false);
        if (res.success) {
          this.notifSvc.success(res.message || 'Ticket asignado correctamente.');
          this.showAssignPanel.set(false);
          this.loadAll(false);
        } else {
          this.notifSvc.error(res.message || 'No se pudo asignar el ticket.');
        }
      },
      error: (err) => {
        this.assigning.set(false);
        this.notifSvc.error(err?.error?.message || 'Error al asignar ticket.');
      }
    });
  }

  updateAssignee(event: Event) {
    this.selectedAssigneeId.set((event.target as HTMLSelectElement).value);
  }

  startEdit() {
    const t = this.ticket();
    if (!t || this.isClosed()) return;
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de editar el ticket.');
      this.showAssignPanel.set(true);
      return;
    }
    this.patchEditForm(t);
    this.editing.set(true);
  }

  cancelEdit() {
    const t = this.ticket();
    if (t) this.patchEditForm(t);
    this.editing.set(false);
  }

  saveEdit() {
    const t = this.ticket();
    if (!t) return;
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de guardar cambios.');
      this.showAssignPanel.set(true);
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.savingEdit.set(true);
    this.ticketSvc.update(this.ticketId, {
      subject: value.subject || '',
      description: value.description || '',
      typeItemId: value.typeItemId || '',
      priorityItemId: value.priorityItemId || '',
      assetId: t.assetId || null,
    }).subscribe({
      next: (res) => {
        this.savingEdit.set(false);
        if (res.success) {
          this.notifSvc.success('Ticket actualizado correctamente.');
          this.editing.set(false);
          this.loadAll(false);
        } else {
          this.notifSvc.error(res.message || 'No se pudo actualizar el ticket.');
        }
      },
      error: (err) => {
        this.savingEdit.set(false);
        this.notifSvc.error(err?.error?.message || 'Error al actualizar el ticket.');
      }
    });
  }

  onAIAnalyze() {
    const t = this.ticket();
    if (!t || this.analyzing()) return;
    if (this.supportNeedsAssignment()) {
      this.notifSvc.warning('Primero asigna un técnico responsable antes de analizar el ticket.');
      this.showAssignPanel.set(true);
      return;
    }

    this.analyzing.set(true);
    this.aiSvc.analyzeTicket(t.subject, t.description || '').subscribe({
      next: (res) => {
        this.analyzing.set(false);
        if (res.success && res.data) {
          const clean = res.data.replace(/```json|```/g, '').trim();
          const insight = this.formatAIInsight(clean);
          this.dialog.open(ConfirmDialogComponent, {
            width: '680px',
            data: {
              title: 'Análisis de IA',
              kicker: 'Asistente inteligente',
              subtitle: 'Resumen operativo para priorizar la atención',
              message: insight.message,
              items: insight.items,
              tone: 'ai',
              confirmText: 'Entendido',
              icon: 'zap',
              color: 'primary'
            }
          });
        } else {
          this.notifSvc.error(this.aiErrorMessage(res.message));
        }
      },
      error: (err) => {
        this.analyzing.set(false);
        this.notifSvc.error(this.aiErrorMessage(err?.error?.message || err?.message));
      }
    });
  }

  isOwnMessage(message: ChatMessage): boolean {
    if (message.pending) return true;
    const user = this.tokenSvc.getUser();
    const userId = user?.userId;
    if (userId && message.authorId === userId) return true;
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toLowerCase();
    return !!fullName && (message.authorName || '').trim().toLowerCase() === fullName;
  }

  private pendingMessage(body: string, isInternal: boolean): ChatMessage {
    return {
      id: isInternal ? 'pending-note' : 'pending-reply',
      ticketId: this.ticketId,
      authorId: this.tokenSvc.getUser()?.userId || '',
      authorName: 'Tú',
      authorInitials: this.currentUserInitials(),
      body,
      isInternal,
      attachments: '[]',
      createdAt: new Date().toISOString(),
      pending: true
    };
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'YO';
  }

  private formatAIInsight(raw: string): { message: string; items: Array<{ label: string; value: string }> } {
    try {
      const parsed = JSON.parse(raw);
      const summary = parsed.summary || parsed.resumen || parsed.analysis || parsed.analisis || 'La IA revisó el caso y propone esta lectura operativa.';
      const items = [
        { label: 'Categoría sugerida', value: parsed.category || parsed.categoria || 'No determinada' },
        { label: 'Prioridad sugerida', value: parsed.priority || parsed.prioridad || 'No determinada' },
        { label: 'Acción recomendada', value: parsed.recommended_action || parsed.action || parsed.accion || parsed.next_step || parsed.next_steps || 'Revisar el detalle y asignar responsable.' },
        { label: 'Respuesta sugerida', value: parsed.suggested_response || parsed.response || parsed.respuesta || 'Sin respuesta sugerida.' }
      ]
        .filter(item => item.value && item.value !== 'undefined')
        .map(item => ({ label: item.label, value: this.aiValueText(item.value) }));
      return { message: this.aiValueText(summary), items };
    } catch {
      return {
        message: raw || 'La IA generó una respuesta, pero no llegó con formato estructurado.',
        items: []
      };
    }
  }

  private aiValueText(value: unknown): string {
    if (Array.isArray(value)) return value.map(v => this.aiValueText(v)).join(' · ');
    if (value && typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${this.aiValueText(val)}`)
        .join(' · ');
    }
    return String(value ?? '');
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

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'justo ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return date.toLocaleDateString();
  }

  onGoBack() { this.router.navigate(['/tickets']); }

  toggleOptions() {
    this.showOptions.update(v => !v);
  }

  setActiveTab(tab: 'conversation' | 'notes' | 'history') {
    if (tab === 'notes' && !this.canUseInternalNotes()) {
      this.activeTab.set('conversation');
      return;
    }
    this.activeTab.set(tab);
    this.queueActiveScroll();
  }

  onReplyKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (this.activeTab() === 'conversation') this.sendReply();
    else if (this.activeTab() === 'notes') this.addNote();
  }

  private syncScrollPosition() {
    const currentChatCount = this.conversationMessages().length;
    const currentNoteCount = this.noteMessages().length;
    const currentHistoryCount = this.history().length;
    const active = this.activeTab();
    const tabChanged = active !== this.lastActiveTab;

    if (active === 'conversation' && (tabChanged || currentChatCount !== this.lastChatCount)) {
      this.scrollElementToBottom(this.chatScroller?.nativeElement);
    }
    if (active === 'notes' && (tabChanged || currentNoteCount !== this.lastNoteCount)) {
      this.scrollElementToBottom(this.chatScroller?.nativeElement);
    }
    if (active === 'history' && (tabChanged || currentHistoryCount !== this.lastHistoryCount)) {
      this.scrollElementToBottom(this.historyScroller?.nativeElement);
    }

    this.lastChatCount = currentChatCount;
    this.lastNoteCount = currentNoteCount;
    this.lastHistoryCount = currentHistoryCount;
    this.lastActiveTab = active;
  }

  private queueConversationScroll() {
    this.queueActiveScroll();
  }

  private queueActiveScroll() {
    setTimeout(() => this.scrollActiveTabToBottom(), 0);
    setTimeout(() => this.scrollActiveTabToBottom(), 120);
  }

  private scrollElementToBottom(element?: HTMLElement) {
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }

  private scrollActiveTabToBottom() {
    if (this.activeTab() === 'history') {
      this.scrollElementToBottom(this.historyScroller?.nativeElement);
      return;
    }
    this.scrollElementToBottom(this.chatScroller?.nativeElement);
  }
}
