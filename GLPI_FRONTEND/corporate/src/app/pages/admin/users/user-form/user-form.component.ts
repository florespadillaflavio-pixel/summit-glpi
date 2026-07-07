import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/ui/notification.service';
import { FileService } from '../../../../core/services/file.service';
import { TokenService } from '../../../../core/services/token.service';
import { UserSummary, UserDetails, Role, Company, ReturnValue, UserCreateUpdateDto } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { InputFieldComponent } from '../../../../shared/components/input-field/input-field';
import { phoneValidator, nombrePattern, MAXLEN } from '../../../../core/validators/app-validators';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const strongPasswordValidator: ValidatorFn = (control: AbstractControl) => {
  const value = String(control.value ?? '');
  if (!value) return null;
  return PASSWORD_PATTERN.test(value) ? null : { strongPassword: true };
};

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent, InputFieldComponent],
  templateUrl: './user-form.component.html',
})

export class UserForm implements OnInit {
  private fb = inject(FormBuilder);
  private userSvc = inject(UserService);
  private notifSvc = inject(NotificationService);
  private fileSvc = inject(FileService);
  private tokenSvc = inject(TokenService);

  // Inputs & Outputs
  user = input<UserSummary | null>(null);
  roles = input<Role[]>([]);
  companies = input<Company[]>([]);
  loading = input<boolean>(false);
  close = output<void>();
  saved = output<void>();

  // State
  saving = signal(false);
  showPassword = signal(false);
  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);
  avatarError = signal<string | null>(null);

  userForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(MAXLEN.NAME), Validators.pattern(nombrePattern)]],
    lastName:  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(MAXLEN.NAME), Validators.pattern(nombrePattern)]],
    email:     ['', [Validators.required, Validators.email, Validators.maxLength(MAXLEN.GENERIC)]],
    phone:     ['', [phoneValidator]],
    roleId:    ['', Validators.required],
    companyId: ['', Validators.required],
    password:  [''],
    avatarUrl: ['']
  });

  ngOnInit() {
    const data = this.user();
    if (data) {
      this.userForm.get('password')?.setValidators([Validators.minLength(8), strongPasswordValidator]);
      if (data.avatarUrl) this.previewUrl.set(data.avatarUrl);

      this.userSvc.getById(data.id).subscribe((res: ReturnValue<UserDetails>) => {
        if (res.success && res.data) {
          const u = res.data;
          this.userForm.patchValue({
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.username,
            phone: u.phone || '',
            roleId: u.roleIds && u.roleIds.length > 0 ? u.roleIds[0] : '',
            companyId: u.companyId,
            avatarUrl: u.avatarUrl || ''
          });
          this.syncCompanyForRole();
        }
      });
    } else {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8), strongPasswordValidator]);
      this.syncCompanyForRole();
    }
    this.userForm.get('password')?.updateValueAndValidity();
  }

  currentCompanyId(): string {
    return this.tokenSvc.getUser()?.companyId || '';
  }

  selectedRole(): Role | undefined {
    const roleId = this.userForm.get('roleId')?.value;
    return this.roles().find(role => role.id === roleId);
  }

  isClientRole(role?: Role): boolean {
    return (role?.roleType || '').trim().toUpperCase() === 'CLIENT'
      || (role?.name || '').trim().toLowerCase() === 'cliente';
  }

  availableCompaniesForRole(): Company[] {
    const selected = this.selectedRole();
    if (this.isClientRole(selected)) return this.companies();

    const currentCompanyId = this.currentCompanyId();
    return this.companies().filter(company => company.id === currentCompanyId);
  }

  companyHelpText(): string {
    const selected = this.selectedRole();
    if (!selected) return 'Primero selecciona un rol para aplicar la regla de empresa.';
    if (this.isClientRole(selected)) return 'Los usuarios Cliente pueden pertenecer a una empresa atendida.';
    return 'Los roles administrativos y técnicos pertenecen solo a la empresa interna.';
  }

  onRoleChange() {
    this.syncCompanyForRole();
  }

  private syncCompanyForRole() {
    const selected = this.selectedRole();
    const currentCompanyId = this.currentCompanyId();
    if (!selected || !currentCompanyId) return;

    if (!this.isClientRole(selected)) {
      this.userForm.patchValue({ companyId: currentCompanyId }, { emitEvent: false });
      return;
    }

    const currentValue = this.userForm.get('companyId')?.value;
    if (!currentValue) {
      this.userForm.patchValue({ companyId: currentCompanyId }, { emitEvent: false });
    }
  }

  hasPasswordValue(): boolean {
    return !!String(this.userForm.get('password')?.value ?? '').trim();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  passwordValue(): string {
    return String(this.userForm.get('password')?.value ?? '');
  }

  passwordRuleClass(rule: 'upper' | 'lower' | 'number' | 'special' | 'length'): string {
    const value = this.passwordValue();
    const passed = {
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z\d]/.test(value),
      length: value.length >= 8,
    }[rule];
    return passed ? 'is-valid' : 'is-pending';
  }

  onClose() {
    this.close.emit();
  }

  isFieldInvalid(field: string) {
    const ctrl = this.userForm.get(field);
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  getFieldError(name: string): string | null {
    const control = this.userForm.get(name);
    if (!control || !control.touched || !control.errors) return null;
    if (control.hasError('required')) return 'Obligatorio';
    if (control.hasError('email')) return 'Email inválido';
    if (control.hasError('phone')) return 'Teléfono inválido';
    if (control.hasError('minlength')) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.hasError('maxlength')) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    if (control.hasError('pattern')) return 'Contiene caracteres no permitidos';
    if (control.hasError('strongPassword')) return 'Debe incluir mayúscula, minúscula, número y carácter especial';
    return 'Inválido';
  }

  onUploadAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.setAvatarFile(file, () => input.value = '');
  }

  onAvatarDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onAvatarDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    this.setAvatarFile(file);
  }

  onAvatarPaste(event: ClipboardEvent) {
    const file = Array.from(event.clipboardData?.files ?? [])[0];
    if (!file) return;
    event.preventDefault();
    this.setAvatarFile(file);
  }

  private setAvatarFile(file: File, reset?: () => void) {
    this.avatarError.set(null);

    if (!this.isAllowedAvatarFile(file)) {
      this.clearPendingAvatar();
      this.avatarError.set('Formato no permitido. Usa JPG, PNG, WEBP, GIF, HEIC o HEIF.');
      reset?.();
      return;
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      this.clearPendingAvatar();
      this.avatarError.set('La imagen no debe superar 2MB.');
      reset?.();
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  private isAllowedAvatarFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const hasAllowedExtension = ALLOWED_AVATAR_EXTENSIONS.has(extension);
    const hasAllowedType = file.type ? ALLOWED_AVATAR_TYPES.has(file.type.toLowerCase()) : false;
    return hasAllowedExtension || hasAllowedType;
  }

  private clearPendingAvatar(): void {
    this.selectedFile = null;
    this.previewUrl.set(this.user()?.avatarUrl ?? null);
  }

  saveUser() {
    if (this.avatarError()) {
      this.notifSvc.error(this.avatarError() || 'Revise la imagen seleccionada.');
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notifSvc.warning('Complete los campos obligatorios antes de guardar.');
      return;
    }

    this.saving.set(true);
    this.syncCompanyForRole();
    const formVal = this.userForm.getRawValue();
    const current = this.user();

    const password = String(formVal.password ?? '').trim();
    const payload: UserCreateUpdateDto = {
      id: current?.id,
      companyId: formVal.companyId,
      firstName: formVal.firstName,
      lastName: formVal.lastName,
      username: formVal.email,
      phone: formVal.phone,
      password,
      avatarUrl: formVal.avatarUrl,
      roleIds: [formVal.roleId]
    };

    if (current) {
      this.userSvc.update(current.id, payload, this.selectedFile || undefined).subscribe({
        next: (res) => {
          if (res.success) {
            this.notifSvc.success('Usuario actualizado correctamente.');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message);
          }
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          this.notifSvc.error(err.error?.message || 'Error al actualizar usuario.');
        }
      });
    } else {
      this.userSvc.create(payload, this.selectedFile || undefined).subscribe({
        next: (res) => {
          if (res.success) {
            this.notifSvc.success('Nuevo usuario creado correctamente.');
            this.saved.emit();
            this.onClose();
          } else {
            this.notifSvc.error(res.message);
          }
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          this.notifSvc.error(err.error?.message || 'Error al crear usuario.');
        }
      });
    }
  }
}
