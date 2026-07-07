import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ReportScheduled } from '../sections/scheduled/report-scheduled.component';
import { ReportAdhoc } from '../sections/adhoc/report-adhoc.component';

@Component({
  selector: 'app-report-shell',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReportScheduled, ReportAdhoc],
  templateUrl: './report-shell.component.html'
})
export class ReportShell {
  activeTab = signal<'programados' | 'ejecutados' | 'adhoc'>('programados');
}
