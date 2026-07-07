import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [style.width]="width" [style.height]="height" [ngClass]="shape"></div>
  `
})
export class SkeletonLoaderComponent {
  @Input() width = '100%';
  @Input() height = '16px';
  @Input() shape: 'circle' | 'rect' = 'rect';
}
