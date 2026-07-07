import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CustomCardComponent } from '../../shared/components/custom-card/custom-card';
import { TokenService } from '../../core/services/token.service';
import { UserPermission, ModuleItem } from '../../core/models';

@Component({
  selector: 'app-module-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, CustomCardComponent],
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

      <div class="mb-10">
        <h1 class="text-3xl font-black text-slate-900 mb-2">{{ moduleName }}</h1>
        <p class="text-slate-500">Selecciona una de las opciones disponibles para este módulo.</p>
      </div>

      <!-- Grid de Opciones -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let item of moduleItems" class="transform transition-all duration-300 hover:-translate-y-2">
          <a [routerLink]="item.link" class="block h-full">
            <app-custom-card [title]="item.label" [subtitle]="item.description || 'Haga clic para entrar'">
              <div class="flex items-center gap-4 py-4">
                <div class="bg-blue-50 p-4 rounded-2xl">
                  <lucide-angular [name]="item.icon" class="w-8 h-8 text-blue-600"></lucide-angular>
                </div>
                <div class="flex-1">
                  <span class="text-xs font-bold text-blue-600 uppercase tracking-widest">Entrar al Módulo</span>
                  <lucide-angular name="arrow-right" class="w-4 h-4 ml-2 inline text-slate-300 group-hover:text-blue-600"></lucide-angular>
                </div>
              </div>
            </app-custom-card>
          </a>
        </div>
      </div>

      <!-- Estado Vacío -->
      <div *ngIf="moduleItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="bg-slate-100 p-6 rounded-full mb-6">
          <lucide-angular name="search-x" class="w-12 h-12 text-slate-400"></lucide-angular>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-2">Sin opciones disponibles</h3>
        <p class="text-slate-500">No se encontraron opciones de vista para este módulo bajo su perfil.</p>
      </div>
    </div>
  `
})
export class ModuleLandingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tokenService = inject(TokenService);

  moduleName: string = '';
  moduleItems: ModuleItem[] = [];

  // Este mapa ayuda a obtener el link real basado en el permiso
  private permissionLinkMap: Record<string, string> = {
    'TICKET_VIEW': '/tickets',
    'KB_VIEW': '/kb',
    'ASSET_VIEW': '/cmdb',
    'CONTRACT_VIEW': '/contracts',
    'REPORT_VIEW': '/reports',
    'CONFIG_VIEW': '/config',
    'USER_VIEW': '/admin/users',
    'ROLE_VIEW': '/admin/roles',
    'COMPANY_VIEW': '/admin/companies',
    'CATALOG_VIEW': '/admin/catalogs',
    'AUDIT_VIEW': '/admin/audit'
  };

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.moduleName = data['title'] || 'Módulo';
      this.loadModuleItems();
    });
  }

  private loadModuleItems(): void {
    const user = this.tokenService.getUser();
    if (!user || !user.permissions) return;

    this.moduleItems = user.permissions
      .filter((p: UserPermission) => p.module_Name === this.moduleName && (p.permission_Code.endsWith('_VIEW') || p.permission_Code.endsWith('_MANAGE')))
      .map((p: UserPermission) => ({
        label: p.permission_Name,
        icon: p.permission_Icon || 'circle',
        link: this.permissionLinkMap[p.permission_Code] || `/unmapped/${p.permission_Code.toLowerCase()}`,
        description: `Gestión integral de ${p.permission_Name.toLowerCase()}`
      }));
  }
}
