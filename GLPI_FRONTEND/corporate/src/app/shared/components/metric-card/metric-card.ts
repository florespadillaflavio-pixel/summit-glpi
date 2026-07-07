import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="glpi-card p-6 flex items-center gap-5" [style.border-left-color]="color" style="border-left-width: 4px;">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center" [style.background-color]="lightColor">
        <lucide-angular [name]="icon" [style.color]="color" class="w-6 h-6"></lucide-angular>
      </div>
      <div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest m-0 mb-1">{{ label }}</p>
        <h3 class="text-3xl font-black text-slate-800 m-0">{{ value }}</h3>
      </div>
    </div>
  `
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() icon = '';
  @Input() color = '#2563eb';
  
  get lightColor() {
    return this.color + '15'; // 15% opacity hex
  }
}
