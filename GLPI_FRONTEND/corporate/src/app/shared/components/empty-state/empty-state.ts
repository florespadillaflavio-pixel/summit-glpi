import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center p-12 text-center">
      <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <lucide-angular [name]="icon()" class="w-10 h-10 text-slate-400"></lucide-angular>
      </div>
      <h3 class="text-xl font-bold text-slate-800 m-0">{{ title() }}</h3>
      <p class="text-slate-500 mt-2 max-w-sm">{{ message() }}</p>
      <ng-content></ng-content>
    </div>
  `
})
export class EmptyStateComponent {
  icon = input<string>('search-x');
  title = input<string>('No se encontraron resultados');
  message = input<string>('Intenta ajustar tus criterios de búsqueda o filtros.');
}
