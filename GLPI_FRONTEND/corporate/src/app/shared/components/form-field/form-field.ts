import { Component, Directive, HostBinding, Input, Optional, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgControl } from '@angular/forms';
import { GLOBAL_VALIDATION_MESSAGES } from '../../../core/config/validation.config';

@Directive({
  selector: '[appInput]',
  standalone: true
})
export class InputDirective {
  @HostBinding('class.custom-app-input') base = true;
  
  constructor(@Optional() public ngControl: NgControl) {}

  @HostBinding('class.is-invalid') get invalid() {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }
}

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-2 w-full mb-5">
      <ng-content></ng-content>
      
      <!-- MENSAJE DE ERROR AUTOMÁTICO -->
      <span class="error-text animate-in slide-in-from-top-1 fade-in duration-200" *ngIf="showError">
        {{ errorMessage }}
      </span>
    </div>
  `
})
export class FormFieldComponent {
  @ContentChild(NgControl) control?: NgControl;
  @Input() controlName?: string; // Para mapear el mensaje del diccionario global

  get showError(): boolean {
    return !!(this.control && this.control.invalid && (this.control.dirty || this.control.touched));
  }

  get errorMessage(): string {
    if (!this.control || !this.control.errors) return '';

    const firstError = Object.keys(this.control.errors)[0];
    const name = this.controlName || this.control.name?.toString() || 'generic';
    
    const messages = GLOBAL_VALIDATION_MESSAGES[name] || GLOBAL_VALIDATION_MESSAGES['generic'];
    return messages[firstError] || GLOBAL_VALIDATION_MESSAGES['generic'][firstError] || 'Campo inválido';
  }
}

@Component({
  selector: 'app-label',
  standalone: true,
  template: `
    <label class="text-xs font-black text-slate-400 uppercase tracking-widest block text-center">
      <ng-content></ng-content>
    </label>
  `
})
export class LabelComponent {}
