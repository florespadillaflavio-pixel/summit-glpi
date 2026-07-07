import { Directive, Input, HostBinding } from '@angular/core';

@Directive({
  selector: '[appButton]',
  standalone: true
})
export class ButtonDirective {
  @Input() variant: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'plain' = 'plain';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() color: 'main' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'default' = 'default';
  @Input() appearance: 'flat' | 'float' | 'outlined' | 'raised' = 'flat';

  @HostBinding('class.app-button') get base() { return true; }
  
  @HostBinding('class.variant-primary') get isPrimary() { return this.variant === 'primary'; }
  @HostBinding('class.variant-plain') get isPlain() { return this.variant === 'plain'; }
  
  @HostBinding('class.size-medium') get isMedium() { return this.size === 'medium'; }
  @HostBinding('class.size-large') get isLarge() { return this.size === 'large'; }
  
  @HostBinding('class.appearance-raised') get isRaised() { return this.appearance === 'raised'; }
}

@Directive({
  selector: '[appIconButton]',
  standalone: true
})
export class IconButtonDirective extends ButtonDirective {
  @HostBinding('class.app-icon-button') get iconBase() { return true; }
}
