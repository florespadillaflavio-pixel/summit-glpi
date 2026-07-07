import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible()) {
      <div class="loading-overlay-container" [style.background]="background()">
        <lucide-angular name="loader" class="spinner text-teal-600" [size]="size()"></lucide-angular>
        @if (message()) {
          <span class="loading-message text-slate-600 font-medium">{{ message() }}</span>
        }
      </div>
    }
  `
})
export class LoadingOverlayComponent {
  visible = input<boolean>(false);
  message = input<string>('');
  size = input<number>(40);
  background = input<string>('rgba(255, 255, 255, 0.8)');
}
