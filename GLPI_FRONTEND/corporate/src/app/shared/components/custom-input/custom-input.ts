import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col gap-1-5 w-full">
      <label *ngIf="label" class="text-sm font-semibold text-slate-700 ml-1">{{ label }}</label>
      <mat-form-field appearance="outline" class="glpi-input-field w-full" subscriptSizing="dynamic">
        <lucide-angular *ngIf="icon" [name]="icon" matPrefix class="w-5 h-5 mr-2 text-slate-400"></lucide-angular>
        <input matInput 
               [formControl]="control" 
               [type]="type" 
               [placeholder]="placeholder"
               [readonly]="readonly">
      </mat-form-field>
    </div>
  `
})
export class CustomInputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() icon?: string;
  @Input() control = new FormControl();
  @Input() readonly = false;
}
