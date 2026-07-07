import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sidebar-item',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <a [routerLink]="link" 
       routerLinkActive="active" 
       [routerLinkActiveOptions]="{exact: exact}"
       class="sidebar-item-link group"
       [ngClass]="{'child-item': level > 0}"
       [style.padding-left.px]="indentation">
      <div class="active-indicator"></div>
      
      <!-- Líneas de jerarquía dinámicas -->
      <ng-container *ngIf="level > 0">
        <div class="hierarchy-line-v" [style.left.px]="lineLeft"></div>
        <div class="hierarchy-line-h" [style.left.px]="lineLeft" [style.width.px]="lineWidth"></div>
      </ng-container>

      <div class="icon-wrapper">
        <lucide-angular [name]="icon" class="item-icon"></lucide-angular>
      </div>
      <span class="item-label text-truncate">{{ label }}</span>
    </a>
  `
})
export class SidebarItemComponent {
  @Input() icon = '';
  @Input() label = '';
  @Input() link = '';
  @Input() exact = false;
  @Input() isChild = false;
  @Input() level = 0;

  get indentation(): number {
    // Nivel 0: 16px
    // Nivel 1: 44px (16 + 28)
    // Nivel 2: 72px (44 + 28)
    return 16 + (this.level * 28);
  }

  get lineLeft(): number {
    // La línea vertical debe alinearse con el centro del icono del padre
    // El icono del padre (nivel N-1) está a: 16 + (N-1)*28 + 12 (centro de 24)
    // Para N=1: 16 + 0 + 12 = 28px
    // Para N=2: 16 + 28 + 12 = 56px
    return 16 + ((this.level - 1) * 28) + 12;
  }

  get lineWidth(): number {
    // La línea horizontal va desde lineLeft hasta el inicio del icono actual
    // Inicio icono actual: indentation (16 + level*28)
    // Para N=1: (16+28) - 28 = 16px
    return this.indentation - this.lineLeft;
  }
}
