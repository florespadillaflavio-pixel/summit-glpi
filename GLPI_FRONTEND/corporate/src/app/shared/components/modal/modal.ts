import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, LoadingOverlayComponent],
  templateUrl: './modal.html'
})
export class ModalComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  icon = input<string>('info');
  dangerIcon = input<boolean>(false);
  loading = input<boolean>(false);
  maxWidth = input<number>(520);

  close = output<void>();
}
