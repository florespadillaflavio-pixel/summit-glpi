import { Component, input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    }
  ],
  templateUrl: './input-field.html'
})
export class InputFieldComponent implements ControlValueAccessor {
  label = input<string>('');
  placeholder = input<string>('');
  type = input<string>('text');
  icon = input<string | null>(null);
  help = input<string>('');
  optional = input<boolean>(false);
  fullWidth = input<boolean>(false);
  error = input<string | null>(null);

  value: string | number | null = '';
  disabled = false;
  showPassword = signal(false);

  onChange: (value: string | number | null) => void = () => {};
  onTouched: () => void = () => {};

  isPassword(): boolean {
    return this.type() === 'password';
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | number | null): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
