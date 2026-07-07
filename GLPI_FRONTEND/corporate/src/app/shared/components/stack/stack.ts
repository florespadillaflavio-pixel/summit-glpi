import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stack',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`
})
export class StackComponent {
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() gap = '16px';
  @Input() @HostBinding('class.padding') padding = false;
  @Input() @HostBinding('class.paddingTop') paddingTop = false;
  @Input() @HostBinding('class.paddingBottom') paddingBottom = false;
  @Input() @HostBinding('class.noGap') noGap = false;
  @Input() @HostBinding('class.wrap') wrap = false;
  @Input() @HostBinding('class.backgroundColor') backgroundColor = false;
  
  @Input() justify = 'stretch';
  @Input() align = 'stretch';

  @HostBinding('class.vertical') get isVertical() { return this.orientation === 'vertical'; }
  @HostBinding('class.horizontal') get isHorizontal() { return this.orientation === 'horizontal'; }

  @HostBinding('style.gap') get gapStyle() { return this.noGap ? '0' : this.gap; }
  @HostBinding('style.justify-content') get justifyStyle() { return this.justify; }
  @HostBinding('style.align-items') get alignStyle() { return this.align; }
}
