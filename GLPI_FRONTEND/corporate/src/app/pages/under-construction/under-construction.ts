import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CustomCardComponent } from '../../shared/components/custom-card/custom-card';

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CustomCardComponent, RouterModule],
  template: `
    <div class="p-6">
      <!-- Breadcrumbs Premium -->
      <nav class="flex mb-8 items-center gap-2 text-sm font-semibold text-slate-400">
        <a routerLink="/dashboard" class="hover:text-blue-600 transition-colors flex items-center gap-1">
          <lucide-angular name="house" class="w-4 h-4"></lucide-angular>
          Inicio
        </a>
        <lucide-angular name="chevron-right" class="w-4 h-4"></lucide-angular>
        <span class="text-slate-900">{{ moduleName }}</span>
      </nav>

      <app-custom-card [title]="moduleName" subtitle="Módulo en desarrollo">
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="bg-blue-50 p-6 rounded-full mb-6">
            <lucide-angular name="construction" class="w-16 h-16 text-blue-600"></lucide-angular>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 mb-2">Pantalla en Construcción</h2>
          <p class="text-slate-500 max-w-md mx-auto">
            Estamos trabajando arduamente para brindarte la mejor experiencia en el módulo de <strong>{{ moduleName }}</strong>. 
            Vuelve pronto para ver las nuevas funcionalidades.
          </p>
        </div>
      </app-custom-card>
    </div>
  `
})
export class UnderConstructionComponent {
  private route = inject(ActivatedRoute);

  get moduleName(): string {
    return this.route.snapshot.data['title'] || 'Módulo';
  }
}
