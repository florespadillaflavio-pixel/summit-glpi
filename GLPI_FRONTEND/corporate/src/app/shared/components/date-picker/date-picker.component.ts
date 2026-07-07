import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, computed, effect, forwardRef, inject, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

type CalendarDay = {
  date: Date;
  value: string;
  label: number;
  inMonth: boolean;
  disabled: boolean;
  today: boolean;
  selected: boolean;
};

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="sm-date-picker"
      [class.is-compact]="compact()"
      [class.is-disabled]="isDisabled || disabled()"
      [class.is-open]="open()"
      [class.align-right]="alignRight()"
    >
      @if (label()) {
        <span class="sm-date-label">{{ label() }}</span>
      }
      <div class="sm-date-control">
        <button
          type="button"
          class="sm-date-trigger"
          [disabled]="isDisabled || disabled()"
          (click)="toggle()"
          (blur)="onTouched()"
        >
          <lucide-angular name="calendar-days" [size]="15"></lucide-angular>
          <span [class.is-placeholder]="!internalValue()">{{ displayValue() }}</span>
        </button>

        @if (clearable() && internalValue() && !(isDisabled || disabled())) {
          <button type="button" class="sm-date-clear" title="Limpiar fecha" (click)="clear($event)">
            <lucide-angular name="x" [size]="14"></lucide-angular>
          </button>
        }

        @if (open()) {
          <div class="sm-date-popover" (mousedown)="$event.preventDefault()">
            <div class="sm-date-calendar-head">
              <button type="button" class="sm-date-nav" (click)="moveMonth(-1)" title="Mes anterior">
                <lucide-angular name="chevron-left" [size]="16"></lucide-angular>
              </button>
              <strong>{{ monthLabel() }}</strong>
              <button type="button" class="sm-date-nav" (click)="moveMonth(1)" title="Mes siguiente">
                <lucide-angular name="chevron-right" [size]="16"></lucide-angular>
              </button>
            </div>

            <div class="sm-date-weekdays">
              @for (day of weekDays; track day) {
                <span>{{ day }}</span>
              }
            </div>

            <div class="sm-date-days">
              @for (day of calendarDays(); track day.value) {
                <button
                  type="button"
                  class="sm-date-day"
                  [class.is-muted]="!day.inMonth"
                  [class.is-today]="day.today"
                  [class.is-selected]="day.selected"
                  [disabled]="day.disabled"
                  (click)="selectDay(day)"
                >
                  {{ day.label }}
                </button>
              }
            </div>

            <div class="sm-date-footer">
              <button type="button" class="sm-date-shortcut" (click)="selectToday()" [disabled]="todayDisabled()">
                Hoy
              </button>
              <button type="button" class="sm-date-shortcut" (click)="close()">Cerrar</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class DatePickerComponent implements ControlValueAccessor {
  private host = inject(ElementRef<HTMLElement>);

  label = input('');
  value = input('');
  min = input('');
  max = input('');
  compact = input(false);
  disabled = input(false);
  clearable = input(false);
  placeholder = input('Seleccionar fecha');
  valueChange = output<string>();

  internalValue = signal('');
  open = signal(false);
  viewDate = signal(this.startOfMonth(new Date()));
  alignRight = signal(false);
  isDisabled = false;
  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  displayValue = computed(() => {
    const value = this.internalValue();
    return value ? this.formatDisplay(value) : this.placeholder();
  });

  monthLabel = computed(() => {
    const date = this.viewDate();
    return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(date);
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const selected = this.internalValue();
    const start = this.startOfCalendar(view);
    const today = this.isoDate(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const value = this.isoDate(date);

      return {
        date,
        value,
        label: date.getDate(),
        inMonth: date.getMonth() === view.getMonth(),
        disabled: this.isOutOfRange(value),
        today: value === today,
        selected: value === selected,
      };
    });
  });

  todayDisabled = computed(() => this.isOutOfRange(this.isoDate(new Date())));

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const next = this.value() || '';
      this.internalValue.set(next);
      if (next) this.viewDate.set(this.startOfMonth(this.parseIsoDate(next)));
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  toggle(): void {
    if (this.isDisabled || this.disabled()) return;
    this.open.update(value => !value);
    const selected = this.internalValue();
    if (selected) this.viewDate.set(this.startOfMonth(this.parseIsoDate(selected)));
    if (this.open()) setTimeout(() => this.updatePopoverAlignment());
  }

  close(): void {
    this.open.set(false);
    this.onTouched();
  }

  moveMonth(offset: number): void {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  selectDay(day: CalendarDay): void {
    if (day.disabled) return;
    this.commitValue(day.value);
    this.close();
  }

  selectToday(): void {
    if (this.todayDisabled()) return;
    this.commitValue(this.isoDate(new Date()));
    this.close();
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.commitValue('');
    this.close();
  }

  private commitValue(value: string): void {
    this.internalValue.set(value);
    if (value) this.viewDate.set(this.startOfMonth(this.parseIsoDate(value)));
    this.onChange(value);
    this.valueChange.emit(value);
  }

  writeValue(value: string | null): void {
    this.internalValue.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  private startOfCalendar(month: Date): Date {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const day = first.getDay() === 0 ? 7 : first.getDay();
    const start = new Date(first);
    start.setDate(first.getDate() - day + 1);
    return start;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day);
  }

  private isoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDisplay(value: string): string {
    const date = this.parseIsoDate(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private isOutOfRange(value: string): boolean {
    return Boolean((this.min() && value < this.min()) || (this.max() && value > this.max()));
  }

  private updatePopoverAlignment(): void {
    const control = this.host.nativeElement.querySelector('.sm-date-control');
    if (!control) return;

    const rect = control.getBoundingClientRect();
    const popoverWidth = Math.min(320, window.innerWidth - 32);
    const overflowRight = rect.left + popoverWidth > window.innerWidth - 16;
    this.alignRight.set(overflowRight);
  }
}
