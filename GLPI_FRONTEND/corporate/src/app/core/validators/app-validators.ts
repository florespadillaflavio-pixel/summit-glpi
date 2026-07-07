import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/**
 * Shared reactive-forms validators and error-message helpers.
 *
 * All single-control validators treat an empty value as VALID so that
 * emptiness is owned exclusively by `Validators.required`. Compose them, e.g.:
 *
 *   nombre: ['', [Validators.required, Validators.maxLength(MAXLEN.NAME), nombrePatternValidator]]
 *   telefono: ['', [phoneValidator]]
 *   sitioWeb: ['', [urlValidator]]
 */

/** Maximum lengths shared across forms. */
export const MAXLEN = {
  NAME: 100,
  TITLE: 150,
  CODE: 50,
  TEXT: 2000,
  GENERIC: 255,
} as const;

/** True when the control holds no meaningful value (null/undefined/empty/blank). */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/**
 * Phone number pattern: optional leading `+`, then digits, spaces, dashes and
 * parentheses. The total count of digits must be between 7 and 20.
 */
const PHONE_ALLOWED = /^\+?[0-9\s()\-]+$/;

/**
 * Valid when empty (let `required` handle emptiness) OR the value looks like a
 * phone number (leading `+` allowed; digits, spaces, dashes, parentheses; 7–20
 * digits total). Fails with `{ phone: true }`.
 */
export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (isEmpty(value)) {
    return null;
  }
  const str = String(value);
  const digitCount = (str.match(/\d/g) ?? []).length;
  if (PHONE_ALLOWED.test(str) && digitCount >= 7 && digitCount <= 20) {
    return null;
  }
  return { phone: true };
};

/**
 * Allowed characters for free-text "name"/"title" fields: letters (including
 * accented Latin letters and ñ/Ñ), digits, spaces and the punctuation
 * `. , ' - _`. Explicitly blocks `< >` and other control/dangerous characters.
 *
 * Usage note — pass this RegExp straight to `Validators.pattern`:
 *
 *   Validators.pattern(nombrePattern)
 *
 * or use the ready-made `nombrePatternValidator` below (equivalent, reusable).
 */
export const nombrePattern: RegExp = /^[\p{L}0-9 .,'\-_]+$/u;

/** Ready-to-use `Validators.pattern` validator built from `nombrePattern`. */
export const nombrePatternValidator: ValidatorFn = Validators.pattern(nombrePattern);

/** Matches a web address with OR without scheme, e.g. https://x.com, www.x.com, techcorp.com/ruta. */
const HTTP_URL = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;

/**
 * Valid when empty OR the value is an absolute `http(s)://` URL.
 * Fails with `{ url: true }`.
 */
export const urlValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (isEmpty(value)) {
    return null;
  }
  return HTTP_URL.test(String(value)) ? null : { url: true };
};

/** Parses a control value into a timestamp, or `NaN` when not a usable date. */
function toTime(value: unknown): number {
  if (isEmpty(value)) {
    return NaN;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return new Date(value as string | number).getTime();
}

/**
 * FormGroup validator: invalid (returns `{ dateRange: true }`) when both dates
 * are set and `from > to`. Attach to the group:
 *
 *   this.fb.group({ ... }, { validators: dateRangeValidator('desde', 'hasta') })
 */
export function dateRangeValidator(fromKey: string, toKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const from = toTime(group.get(fromKey)?.value);
    const to = toTime(group.get(toKey)?.value);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return null;
    }
    return from > to ? { dateRange: true } : null;
  };
}

/**
 * FormGroup validator: invalid (returns `{ rangeOrder: true }`) when both
 * numeric values are set and `value(maxKey) < value(minKey)`. Useful for SLA
 * where resolve time must be >= response time.
 */
export function minGteValidator(minKey: string, maxKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const minRaw = group.get(minKey)?.value;
    const maxRaw = group.get(maxKey)?.value;
    if (isEmpty(minRaw) || isEmpty(maxRaw)) {
      return null;
    }
    const min = Number(minRaw);
    const max = Number(maxRaw);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      return null;
    }
    return max < min ? { rangeOrder: true } : null;
  };
}

/**
 * Returns a Spanish error message for the first error on `control`, or `''`
 * when the control is valid, untouched-and-pristine, or missing.
 *
 * @param control the reactive-forms control (may be null)
 * @param label   human label used in required/pattern messages
 */
export function getControlError(control: AbstractControl | null, label: string): string {
  if (!control || !control.errors || !(control.touched || control.dirty)) {
    return '';
  }

  const errors: ValidationErrors = control.errors;

  if (errors['required']) {
    return `${label} es obligatorio`;
  }
  if (errors['email']) {
    return 'Correo inválido';
  }
  if (errors['phone']) {
    return 'Teléfono inválido';
  }
  if (errors['url']) {
    return 'URL inválida';
  }
  if (errors['minlength']) {
    const required = errors['minlength']?.requiredLength;
    return `${label} debe tener al menos ${required} caracteres`;
  }
  if (errors['maxlength']) {
    const required = errors['maxlength']?.requiredLength;
    return `${label} no puede superar los ${required} caracteres`;
  }
  if (errors['min']) {
    const min = errors['min']?.min;
    return `${label} debe ser mayor o igual a ${min}`;
  }
  if (errors['pattern']) {
    return `${label} contiene caracteres no permitidos`;
  }
  if (errors['dateRange']) {
    return 'La fecha inicial no puede ser mayor a la final';
  }
  if (errors['rangeOrder']) {
    return 'El valor máximo no puede ser menor al mínimo';
  }

  return '';
}
