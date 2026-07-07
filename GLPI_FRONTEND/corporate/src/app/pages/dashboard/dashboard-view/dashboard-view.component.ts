import { Component, OnDestroy, OnInit, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TicketService } from '../../../core/services/ticket.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { Ticket, DashboardKPIs, StatCard, ChartBar, RecentTicket } from '../../../core/models';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

function timeAgo(date: Date | string): string {
  const d   = date instanceof Date ? date : new Date(date);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60)   return 'hace un momento';
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
  return `hace ${Math.floor(sec / 86400)} d`;
}

function statusBadgeClass(code: string): string {
  const map: Record<string, string> = {
    OPEN: 'is-open', IN_PROGRESS: 'is-progress', PENDING: 'is-pending',
    WAITING: 'is-waiting', RESOLVED: 'is-resolved', CLOSED: 'is-closed'
  };
  return map[code] ?? 'is-open';
}

function priorityBadgeClass(code: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'is-critical', HIGH: 'is-high', MEDIUM: 'is-medium', LOW: 'is-low'
  };
  return map[code] ?? 'is-medium';
}

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, DatePickerComponent],
  templateUrl: './dashboard-view.component.html'
})
export class DashboardView implements OnInit, OnDestroy {
  private ticketSvc = inject(TicketService);
  private dashboardSvc = inject(DashboardService);
  private realtimeSvc = inject(RealtimeService);
  private realtimeEvents = ['ticket-created', 'ticket-updated', 'ticket-status-changed', 'ticket-assigned', 'ticket-comment-added', 'ticket-note-added'];

  // Date controls
  private today    = new Date().toISOString().split('T')[0];
  private monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  dateFrom = new FormControl(this.monthAgo);
  dateTo   = new FormControl(this.today);

  // Signals
  loading       = signal(true);
  syncing       = signal(false);
  errorMsg      = signal('');
  rawStats      = signal<DashboardKPIs | null>(null);
  rawTickets    = signal<Ticket[]>([]);

  activeTickets = computed(() =>
    this.rawTickets().filter(t => ['OPEN', 'IN_PROGRESS', 'PENDING'].includes(t.statusCode))
  );

  unassignedTickets = computed(() =>
    this.activeTickets().filter(t => !t.assignedToName?.trim()).length
  );

  criticalActiveTickets = computed(() =>
    this.activeTickets().filter(t => ['CRITICAL', 'HIGH'].includes(t.priorityCode)).length
  );

  slaRiskTickets = computed(() =>
    this.activeTickets().filter(t => this.ticketSlaPercent(t) >= 80).length
  );

  resolvedTickets = computed(() =>
    this.rawTickets().filter(t => ['RESOLVED', 'CLOSED'].includes(t.statusCode)).length
  );

  slaCompliance = computed(() => {
    const active = Math.max(this.activeTickets().length, 1);
    const breached = this.rawStats()?.slaBreached ?? this.slaRiskTickets();
    return Math.max(0, Math.round(100 - (breached / active) * 100));
  });

  operationsSummary = computed(() => {
    const total = this.rawTickets().length;
    const active = this.activeTickets().length;
    const closed = this.resolvedTickets();
    const activePct = total ? Math.round((active / total) * 100) : 0;
    const closedPct = total ? Math.round((closed / total) * 100) : 0;
    return { total, active, closed, activePct, closedPct };
  });

  statCards = computed<StatCard[]>(() => {
    const s = this.rawStats();
    return [
      { label: 'Tickets activos', value: this.activeTickets().length, trend: this.unassignedTickets(), trendGoodWhenUp: false, icon: 'ticket-check' },
      { label: 'Alta prioridad', value: this.criticalActiveTickets(), trend: this.slaRiskTickets(), trendGoodWhenUp: false, icon: 'alert-triangle' },
      { label: 'Resueltos hoy', value: s?.resolvedToday ?? 0, trend: this.resolvedTickets(), trendGoodWhenUp: true, icon: 'check-circle' },
      { label: 'SLA saludable', value: `${this.slaCompliance()}%`, trend: s?.slaBreached ?? 0, trendGoodWhenUp: false, icon: 'shield-check' }
    ];
  });

  statusBars = computed<ChartBar[]>(() => {
    const tickets = this.rawTickets();
    const s = this.rawStats();
    const counts: Record<string, number> = {
      OPEN:        s?.openTickets        ?? tickets.filter(t => t.statusCode === 'OPEN').length,
      IN_PROGRESS: s?.inProgressTickets  ?? tickets.filter(t => t.statusCode === 'IN_PROGRESS').length,
      PENDING:     tickets.filter(t => t.statusCode === 'PENDING').length,
      RESOLVED:    tickets.filter(t => t.statusCode === 'RESOLVED').length,
      CLOSED:      tickets.filter(t => t.statusCode === 'CLOSED').length,
    };
    const max = Math.max(...Object.values(counts), 1);
    return [
      { label: 'Abiertos',    count: counts['OPEN'],        max, cls: 'bar-open'     },
      { label: 'En Progreso', count: counts['IN_PROGRESS'], max, cls: 'bar-progress' },
      { label: 'Pendientes',  count: counts['PENDING'],     max, cls: 'bar-pending'  },
      { label: 'Resueltos',   count: counts['RESOLVED'],    max, cls: 'bar-resolved' },
      { label: 'Cerrados',    count: counts['CLOSED'],      max, cls: 'bar-closed'   },
    ];
  });

  priorityBars = computed<ChartBar[]>(() => {
    const tickets = this.rawTickets();
    const counts: Record<string, number> = {
      CRITICAL: tickets.filter(t => t.priorityCode === 'CRITICAL').length,
      HIGH:     tickets.filter(t => t.priorityCode === 'HIGH').length,
      MEDIUM:   tickets.filter(t => t.priorityCode === 'MEDIUM').length,
      LOW:      tickets.filter(t => t.priorityCode === 'LOW').length,
    };
    const max = Math.max(...Object.values(counts), 1);
    return [
      { label: 'Crítica', count: counts['CRITICAL'], max, cls: 'bar-critical' },
      { label: 'Alta',    count: counts['HIGH'],     max, cls: 'bar-high'     },
      { label: 'Media',   count: counts['MEDIUM'],   max, cls: 'bar-medium'   },
      { label: 'Baja',    count: counts['LOW'],      max, cls: 'bar-low'      },
    ];
  });

  recentTickets = computed<Array<RecentTicket & { slaPercent: number; slaClass: string }>>(() =>
    this.attentionQueue().slice(0, 8).map(t => ({
      id:         t.id,
      number:     t.ticketNumber,
      subject:    t.subject,
      statusCode: t.statusCode ?? 'OPEN',
      statusName: t.statusName ?? 'Abierto',
      priCode:    t.priorityCode ?? 'MEDIUM',
      priName:    t.priorityName ?? 'Media',
      assignee:   t.assignedToName || 'Sin asignar',
      createdAgo: timeAgo(t.createdAt),
      slaPercent: this.ticketSlaPercent(t),
      slaClass: this.ticketSlaClass(t),
    }))
  );

  attentionQueue = computed(() => {
    const priorityWeight: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...this.activeTickets()].sort((a, b) => {
      const p = (priorityWeight[a.priorityCode] ?? 9) - (priorityWeight[b.priorityCode] ?? 9);
      if (p !== 0) return p;
      const unassigned = Number(!b.assignedToName) - Number(!a.assignedToName);
      if (unassigned !== 0) return unassigned;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  });

  topTechnicians = computed(() => {
    const counts = new Map<string, number>();
    this.rawTickets()
      .filter(t => !!t.assignedToName?.trim())
      .forEach(t => counts.set(t.assignedToName!, (counts.get(t.assignedToName!) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  });

  statusBadgeClass   = statusBadgeClass;
  priorityBadgeClass = priorityBadgeClass;

  ngOnInit(): void {
    this.loadData();
    this.realtimeSvc.connectTickets()
      .then(() => {
        for (const eventName of this.realtimeEvents) {
          this.realtimeSvc.on(eventName, this.onRealtimeTicketChange);
        }
      })
      .catch(() => this.errorMsg.set('El dashboard cargó, pero no se pudo iniciar tiempo real.'));
  }

  ngOnDestroy(): void {
    for (const eventName of this.realtimeEvents) {
      this.realtimeSvc.off(eventName, this.onRealtimeTicketChange);
    }
  }

  onReload(): void { this.loadData(); }

  trendIsGood(card: StatCard): boolean {
    return card.trendGoodWhenUp ? card.trend >= 0 : card.trend < 0;
  }

  statHelper(card: StatCard): string {
    if (card.label === 'Tickets activos') return `${card.trend} sin asignar`;
    if (card.label === 'Alta prioridad') return `${card.trend} en riesgo SLA`;
    if (card.label === 'Resueltos hoy') return `${card.trend} resueltos/cerrados`;
    return `${card.trend} incumplimientos`;
  }

  ticketSlaPercent(ticket: Ticket): number {
    const created = new Date(ticket.createdAt).getTime();
    if (Number.isNaN(created)) return 0;
    const totalMinutes = this.prioritySlaMinutes(ticket.priorityCode);
    const elapsed = Math.max(0, Math.floor((Date.now() - created) / 60000));
    return Math.min(100, Math.round((elapsed / totalMinutes) * 100));
  }

  ticketSlaClass(ticket: Ticket): string {
    const pct = this.ticketSlaPercent(ticket);
    if (pct >= 100) return 'danger';
    if (pct >= 80) return 'warning';
    if (pct >= 55) return 'info';
    return 'success';
  }

  trackTicket(_: number, ticket: RecentTicket): string { return ticket.id; }

  private prioritySlaMinutes(priorityCode: string): number {
    const code = (priorityCode || '').toUpperCase();
    if (code === 'CRITICAL') return 60;
    if (code === 'HIGH') return 4 * 60;
    if (code === 'LOW') return 24 * 60;
    return 8 * 60;
  }

  private onRealtimeTicketChange = () => this.loadData(false);

  private loadData(showSpinner = true): void {
    if (showSpinner) this.loading.set(true);
    this.syncing.set(!showSpinner);
    this.errorMsg.set('');
    const from = this.dateFrom.value ?? this.monthAgo;
    const to   = this.dateTo.value   ?? this.today;
    this.dashboardSvc.getKPIs(from, to).subscribe({
      next: res => { if (res.success && res.data) this.rawStats.set(res.data); },
      error: () => this.errorMsg.set('No se pudieron cargar los indicadores del dashboard.')
    });
    this.ticketSvc.getAll().subscribe({
      next: res => {
        if (res.success && res.data) this.rawTickets.set(res.data);
        this.loading.set(false);
        this.syncing.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar la cola de tickets.');
        this.loading.set(false);
        this.syncing.set(false);
      }
    });
  }
}
