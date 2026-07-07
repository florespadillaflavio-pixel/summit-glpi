import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RoleService } from '../../../../core/services/role.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { Role, ReturnValue } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../../shared/components/input-field/input-field';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './role-form.component.html',
})
export class RoleForm implements OnInit {
  private fb = inject(FormBuilder);
  private roleSvc = inject(RoleService);
  private notifSvc = inject(NotificationService);

  // Inputs & Outputs
  role = input<Role | null>(null);
  loading = input<boolean>(false);
  close = output<void>();
  saved = output<void>();

  // State
  saving = signal(false);
  editingRole = signal<Role | null>(null);

  roleForm: FormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern('^[a-zA-ZÀ-ÿ0-9 ]+$')]],
    description: ['', [Validators.maxLength(200)]],
    roleType:    ['CUSTOM', Validators.required]
  });

  ngOnInit() {
    let n = this.role();
    if (n) {
      this.loadRoleData(n.id);
    }
  }

  loadRoleData(id: string) {
    this.roleSvc.getById(id).subscribe({
      next: (res: ReturnValue<Role>) => {
        if (res.success && res.data) {
          let i = res.data;
          this.editingRole.set(i);
          this.roleForm.patchValue({
            name: i.name,
            description: i.description,
            roleType: i.roleType === 'CLIENT' ? 'CLIENT' : 'CUSTOM'
          });
          this.roleForm.get('roleType')?.disable({ emitEvent: false });
          this.roleForm.markAsUntouched();
        }
      }
    });
  }

  onClose() {
    this.close.emit();
  }

  getFieldError(name: string): string | null {
    const control = this.roleForm.get(name);
    if (!control || !control.touched || !control.errors) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio';
    if (control.hasError('minlength')) return `Debe tener al menos ${control.getError('minlength').requiredLength} caracteres`;
    if (control.hasError('maxlength')) return 'Contenido demasiado extenso';
    if (control.hasError('pattern')) return 'Solo se permiten letras, números y espacios';
    return 'Campo inválido';
  }

  saveRole() {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    let n = this.roleForm.getRawValue();
    let e = this.editingRole();
    this.saving.set(true);

    const payload: Partial<Role> = {
      name: n.name,
      description: n.description ?? '',
      roleType: n.roleType ?? 'CUSTOM',
    };

    if (e) {
      this.roleSvc.update(e.id, { ...payload, id: e.id }).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.notifSvc.success(res.message || 'Perfil de acceso actualizado correctamente.');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message || 'No se pudo actualizar el perfil.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.notifSvc.error(err.error?.message || 'Error al actualizar el perfil.');
        }
      });
    } else {
      this.roleSvc.create(payload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.notifSvc.success(res.message || 'Nuevo perfil de acceso creado.');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message || 'No se pudo crear el perfil.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.notifSvc.error(err.error?.message || 'Error al crear el perfil.');
        }
      });
    }
  }
}
