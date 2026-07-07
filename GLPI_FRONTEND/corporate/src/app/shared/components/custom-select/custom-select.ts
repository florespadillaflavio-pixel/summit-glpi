import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface SelectOption<T = unknown> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col gap-1-5 w-full">
      <label *ngIf="label" class="text-sm font-semibold text-slate-700 ml-1">{{ label }}</label>
      <mat-form-field appearance="outline" class="glpi-input-field w-full" subscriptSizing="dynamic">
        <lucide-angular *ngIf="icon" [name]="icon" matPrefix class="w-5 h-5 mr-2 text-slate-400"></lucide-angular>
        <mat-select [formControl]="control" [placeholder]="placeholder">
          <mat-option *ngFor="let option of options" [value]="option.value">
            {{ option.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `
})
export class CustomSelectComponent<T = unknown> {
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() placeholder: string = 'Seleccione una opción...';
  @Input() options: SelectOption<T>[] = [];
  @Input() control: FormControl = new FormControl();
}
