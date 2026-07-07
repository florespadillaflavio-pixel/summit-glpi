import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`
})
export class CardComponent {
  @Input() @HostBinding('class.outlined') outlined = false;
  @Input() @HostBinding('class.raised') raised = false;
  @Input() @HostBinding('class.flat') flat = true;
  @Input() @HostBinding('class.padding') padding = false;
  
  @Input() set appearance(value: 'flat' | 'outlined' | 'raised') {
    this.flat = value === 'flat';
    this.outlined = value === 'outlined';
    this.raised = value === 'raised';
  }
}

@Component({
  selector: 'app-card-header',
  standalone: true,
  template: `<div class="flex items-center gap-4"><ng-content></ng-content></div>`
})
export class CardHeaderComponent {}

@Component({
  selector: 'app-card-title',
  standalone: true,
  template: `<h3 class="m-0 font-black text-slate-900"><ng-content></ng-content></h3>`
})
export class CardTitleComponent {}

@Component({
  selector: 'app-card-content',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class CardContentComponent {
    @Input() @HostBinding('class.noPadding') noPadding = false;
}
